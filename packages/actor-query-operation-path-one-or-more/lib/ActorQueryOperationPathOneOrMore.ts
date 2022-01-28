import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { IQueryableResultBindings, Bindings, IQueryableResult, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { BufferedIterator, MultiTransformIterator, TransformIterator } from 'asynciterator';
import { Algebra } from 'sparqlalgebrajs';

const BF = new BindingsFactory();

/**
 * A comunica Path OneOrMore Query Operation Actor.
 */
export class ActorQueryOperationPathOneOrMore extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ONE_OR_MORE_PATH);
  }

  public async runOperation(operation: Algebra.Path, context: IActionContext): Promise<IQueryableResult> {
    const distinct = await this.isPathArbitraryLengthDistinct(context, operation);
    if (distinct.operation) {
      return distinct.operation;
    }

    context = distinct.context;

    const predicate = <Algebra.OneOrMorePath> operation.predicate;

    if (operation.subject.termType !== 'Variable' && operation.object.termType === 'Variable') {
      // Get all the results of applying this once, then do zeroOrMore for those
      const single = ActorAbstractPath.FACTORY.createDistinct(
        ActorAbstractPath.FACTORY.createPath(operation.subject, predicate.path, operation.object, operation.graph),
      );
      const results = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ context, operation: single }),
      );

      const objectVar = operation.object;

      // All branches need to share the same termHashes to prevent duplicates
      const termHashes = {};

      const bindingsStream: MultiTransformIterator<Bindings, Bindings> = new MultiTransformIterator(
        results.bindingsStream,
        {
          multiTransform: (bindings: Bindings) => {
            const val: RDF.Term = bindings.get(objectVar)!;
            const graph = operation.graph.termType === 'Variable' ? bindings.get(operation.graph) : operation.graph;
            return new TransformIterator<Bindings>(
              async() => {
                const it = new BufferedIterator<RDF.Term>();
                await this.getObjectsPredicateStar(val,
                  predicate.path,
                  operation.graph,
                  context,
                  termHashes,
                  it,
                  { count: 0 });
                return it.transform<Bindings>({
                  transform(item, next, push) {
                    let binding = BF.bindings([[ objectVar, item ]]);
                    if (operation.graph.termType === 'Variable') {
                      binding = binding.set(operation.graph, graph!);
                    }
                    push(binding);
                    next();
                  },
                });
              }, { maxBufferSize: 128 },
            );
          },
          autoStart: false,
        },
      );
      const variables = operation.graph.termType === 'Variable' ? [ objectVar, operation.graph ] : [ objectVar ];
      return { type: 'bindings', bindingsStream, variables, metadata: results.metadata };
    }
    if (operation.subject.termType === 'Variable' && operation.object.termType === 'Variable') {
      // Get all the results of subjects with same predicate, but once, then fill in first variable for those
      const single = ActorAbstractPath.FACTORY.createDistinct(
        ActorAbstractPath.FACTORY
          .createPath(operation.subject, operation.predicate.path, operation.object, operation.graph),
      );
      const results = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ context, operation: single }),
      );
      const subjectVar = operation.subject;
      const objectVar = operation.object;

      const termHashes = {};

      const bindingsStream: MultiTransformIterator<Bindings, Bindings> = new MultiTransformIterator(
        results.bindingsStream,
        {
          multiTransform: (bindings: Bindings) => {
            const subject = bindings.get(subjectVar);
            const object = bindings.get(objectVar);
            const graph = operation.graph.termType === 'Variable' ? bindings.get(operation.graph) : operation.graph;
            return new TransformIterator<Bindings>(
              async() => {
                const it = new BufferedIterator<Bindings>();
                await this.getSubjectAndObjectBindingsPredicateStar(
                  subjectVar,
                  objectVar,
                  subject!,
                  object!,
                  predicate.path,
                  graph!,
                  context,
                  termHashes,
                  {},
                  it,
                  { count: 0 },
                );
                return it.transform<Bindings>({
                  transform(item, next, push) {
                    if (operation.graph.termType === 'Variable') {
                      item = item.set(operation.graph, graph!);
                    }
                    push(item);
                    next();
                  },
                });
              }, { maxBufferSize: 128 },
            );
          },
          autoStart: false,
        },
      );
      const variables = operation.graph.termType === 'Variable' ?
        [ subjectVar, objectVar, operation.graph ] :
        [ subjectVar, objectVar ];
      return { type: 'bindings', bindingsStream, variables, metadata: results.metadata };
    }
    if (operation.subject.termType === 'Variable' && operation.object.termType !== 'Variable') {
      return <Promise<IQueryableResultBindings>> this.mediatorQueryOperation.mediate({
        context,
        operation: ActorAbstractPath.FACTORY.createPath(
          operation.object,
          ActorAbstractPath.FACTORY.createOneOrMorePath(
            ActorAbstractPath.FACTORY.createInv(predicate.path),
          ),
          operation.subject,
          operation.graph,
        ),
      });
    }
    // If (!sVar && !oVar)
    const variable = this.generateVariable();
    const results = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate({
      context,
      operation: ActorAbstractPath.FACTORY.createPath(operation.subject, predicate, variable, operation.graph),
    }));
    const bindingsStream = results.bindingsStream.transform<Bindings>({
      filter: item => operation.object.equals(item.get(variable)),
      transform(item, next, push) {
        const binding = operation.graph.termType === 'Variable' ?
          BF.bindings([[ operation.graph, item.get(operation.graph)! ]]) :
          BF.bindings();
        push(binding);
        next();
      },
    });
    return {
      type: 'bindings',
      bindingsStream,
      variables: operation.graph.termType === 'Variable' ? [ operation.graph ] : [],
      metadata: results.metadata,
    };
  }
}

