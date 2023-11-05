import { ActorQueryOperation, ActorQueryOperationTypedMediated,
  IActionQueryOperation,
  IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActionContext, IActorArgs, IActorTest } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import { MetadataBindings, type Bindings, type IActionContext, type IMetadata, type IQueryOperationResult, IQueryOperationResultBindings, IQueryOperationResultQuads } from '@comunica/types';
import { EmptyIterator, wrap } from 'asynciterator';
import { DataFactory, Quad, Variable } from 'rdf-data-factory';
import { Algebra, Util } from 'sparqlalgebrajs';
import { getContextSourceFirst, getDataSourceType, getDataSourceValue } from '@comunica/bus-rdf-resolve-quad-pattern';
import { getContextDestinationFirst, getDataDestinationType, getDataDestinationValue } from '@comunica/bus-rdf-update-quads';
import { string } from '@comunica/expression-evaluator/lib/functions/Helpers';
import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import { MediatorHttp } from '@comunica/bus-http';
import type * as RDF from '@rdfjs/types';
import { BindingsFactory } from '@comunica/bindings-factory';
import { LazyCardinalityIterator } from './LazyCardinalityIterator';
import { ActorQueryOperationSparqlEndpoint } from '../../actor-query-operation-sparql-endpoint/lib';
const BF = new BindingsFactory();
const DF = new DataFactory();

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles SPARQL custom-endpoint operations.
 */
export class ActorQueryOperationCustomEndpoint extends ActorQueryOperation{

  endpointFetcher: SparqlEndpointFetcher;
  public readonly mediatorHttp: MediatorHttp;
  lastContext: IActionContext;

  public constructor(args: IActorQueryOperationCustomEndpointArgs) {
    super(args);
    this.endpointFetcher = new SparqlEndpointFetcher({
      method: 'GET',
      fetch: (input: Request | string, init?: RequestInit) => this.mediatorHttp.mediate(
        { input, init, context: this.lastContext },
      ),
      prefixVariableQuestionMark: true,
    });
  }

  public async test(action: IActionQueryOperation): Promise<IActorTest> {
    const available_operations = ["pattern"]
    //console.log("custom endpoint test action: ", action.operation.type, available_operations.includes(action.operation.type));
    //throw new Error('Method not implemented.');
    if(!available_operations.includes(action.operation.type)){
      throw new Error(`${this.name} is not able to process ${action.operation.type} operations`);
    }
    return true;
    
  }

  public async run(action: IActionQueryOperation): Promise<IQueryOperationResult> {

    const source = getContextSourceFirst(action.context);
    if (!source) {
      throw new Error('Illegal state: undefined sparql endpoint source.');
    }
    const endpoint: string = <string> getDataSourceValue(source);
    
    this.lastContext = action.context;


    const variables = Util.inScopeVariables(action.operation);
    const canContainUndefs = this.canOperationContainUndefs(action.operation);

    const query: string = this.subQueryFromAction(action)
    
    return this.executeQuery(endpoint, query!, false, variables, canContainUndefs);

    // var bindingsStream = new EmptyIterator<Bindings>;

    // const temp = {
    //   state: new MetadataValidationState(),
    //   cardinality: { type: 'exact', value: await 1 },
    //   canContainUndefs: true,
    //   variables: []
    // }

    // const metadata = () => new Promise<MetadataBindings>(() => temp)

    // this.subQueryFromAction(action)

    // return { type: 'bindings', bindingsStream, metadata }; // TODO: implement

  }

  public canOperationContainUndefs(operation: Algebra.Operation): boolean {
    let canContainUndefs = false;

    Util.recurseOperation(operation, {
      [Algebra.types.LEFT_JOIN]() {
        canContainUndefs = true;
        return false;
      },
      [Algebra.types.VALUES](op) {
        for (const bindings of op.bindings) {
          const bindingsKeys = Object.keys(bindings);
          if (!op.variables.every(variable => bindingsKeys.includes(`?${variable.value}`))) {
            canContainUndefs = true;
          }
        }
        return false;
      },
    });

    return canContainUndefs;
  }


  public subQueryFromAction(action: IActionQueryOperation){
    //console.log(action.operation)

    var subQuery: string = "";


    switch(action.operation.type){
      case "join":{
        subQuery += this._subQueryJoin(action);
        break;
      }
      case "pattern": {
        //TODO: properly implement a _subQueryPattern function
        subQuery += this._subQueryPattern(action);
        break;
      }
    }

    return subQuery
  }

  private _subQueryJoin(action: IActionQueryOperation): string{
    var stringQuery: string = "";

    stringQuery += "SELECT * WHERE { ";

    action.operation.input.forEach((input: any) => {
      

      stringQuery += this._inputToQueryPatternString(input)

      
    });
    stringQuery += "}"
    return stringQuery;
  }

  private _subQueryPattern(action: IActionQueryOperation){
    var stringQuery: string = "";

    stringQuery += "SELECT * WHERE { ";

    stringQuery += this._inputToQueryPatternString(action.operation)

    stringQuery += "}"

    return stringQuery;
  }

  private _inputToQueryPatternString(input: any) {
    var q = "";

    // console.log("input.object.termType: ", input.object.termType)

    q += this._cleanPatternElement(input.subject)
    q += ' '

    q += this._cleanPatternElement(input.predicate)
    q += ' '

    q += this._cleanPatternElement(input.object)
    q += '.'

    return q;
  }

  private _cleanPatternElement(patternElement: any){
    var cpe: string = "";

    switch(patternElement.termType){
      case "Variable": {
        cpe += '?'
        cpe += patternElement.value
        break;
      }
      case "NamedNode": {
        cpe += '<'
        cpe += patternElement.value
        cpe += '>'
        break;
      }
      case "Literal": {
        cpe += "\""
        cpe += patternElement.value
        cpe += "\""
        break;
      }
    }

    return cpe;
  }

  public executeQuery(
    endpoint: string, 
    query: string, 
    quads: boolean, 
    variables: RDF.Variable[] | undefined, 
    canContainUndefs: boolean
    ): IQueryOperationResult{

    const inputStream: Promise<NodeJS.EventEmitter> = quads ?
    this.endpointFetcher.fetchTriples(endpoint, query) :
    this.endpointFetcher.fetchBindings(endpoint, query);

    const stream = wrap<any>(inputStream, { autoStart: false }).map(rawData => quads ?
      rawData :
      BF.bindings(Object.entries(rawData)
        .map(([ key, value ]: [string, RDF.Term]) => [ DF.variable(key.slice(1)), value ])));

    const resultStream = new LazyCardinalityIterator(stream);

    const metadata: () => Promise<IMetadata<any>> = ActorQueryOperationSparqlEndpoint.cachifyMetadata(
      async() => ({
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: await resultStream.getCardinality() },
        canContainUndefs,
        variables,
      }),
    );

    if (quads) {
      return <IQueryOperationResultQuads> {
        type: 'quads',
        quadStream: resultStream,
        metadata,
      };
    }
    return <IQueryOperationResultBindings> <unknown> {
      type: 'bindings',
      bindingsStream: <AsyncIterator<any>> <unknown>resultStream,
      metadata,
    };
    
  }

  // public async testOperation(pattern: Algebra.Join, context: IActionContext): Promise<IActorTest> {
  //   console.log("test operation custom: ", context)
  //   return true; // TODO implement
  // }

  // public async runOperation(pattern: Algebra.Join, context: IActionContext):
  // Promise<IQueryOperationResult> {
  //   console.log("run operation custom: ", context)

  //   // Call other query operations like this:
  //   // const output: IQueryOperationResult = await this.mediatorQueryOperation.mediate({ operation, context });
  //   var bindingsStream = new EmptyIterator<Bindings>;

  //   const temp = {
  //     state: new MetadataValidationState(),
  //     cardinality: { type: 'exact', value: await 1 },
  //     canContainUndefs: true,
  //     variables: []
  //   }

  //   const metadata = () => new Promise<MetadataBindings>(() => temp)

  //   return { type: 'bindings', bindingsStream, metadata }; // TODO: implement
  // }
}


export interface IActorQueryOperationCustomEndpointArgs
  extends IActorArgs<IActionQueryOperation, IActorTest, IQueryOperationResult> {

    /**
   * The HTTP mediator
   */
  mediatorHttp: MediatorHttp;
}


