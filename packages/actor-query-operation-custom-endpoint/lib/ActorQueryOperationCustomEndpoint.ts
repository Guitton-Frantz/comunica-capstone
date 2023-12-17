import { ActorQueryOperation, 
  IActionQueryOperation } from '@comunica/bus-query-operation';
import { IActorArgs, IActorTest } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import { type IActionContext, type IMetadata, type IQueryOperationResult, IQueryOperationResultBindings, IQueryOperationResultQuads } from '@comunica/types';
import { wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Util } from 'sparqlalgebrajs';
import { getContextSourceFirst, getDataSourceValue } from '@comunica/bus-rdf-resolve-quad-pattern';
import { MediatorHttp } from '@comunica/bus-http';
import type * as RDF from '@rdfjs/types';
import { BindingsFactory } from '@comunica/bindings-factory';
import { LazyCardinalityIterator } from './LazyCardinalityIterator';
import { ActorQueryOperationSparqlEndpoint } from '../../actor-query-operation-sparql-endpoint/lib';
import { SageEndpointFetcher } from './SageEndpointFetcher';
import { str } from '@comunica/expression-evaluator/test/util/Aliases';
const BF = new BindingsFactory();
const DF = new DataFactory();

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles SPARQL custom-endpoint operations.
 */
export class ActorQueryOperationCustomEndpoint extends ActorQueryOperation{

  endpointFetcher: SageEndpointFetcher;
  public readonly mediatorHttp: MediatorHttp;
  lastContext: IActionContext;

  public constructor(args: IActorQueryOperationCustomEndpointArgs) {
    super(args);
    this.endpointFetcher = new SageEndpointFetcher({
      method: 'POST',
      fetch: (input: Request | string, init?: RequestInit) => {
        var result = this.mediatorHttp.mediate(
          { input, init, context: this.lastContext },
        )
        return result},
    });
  }

  private isOperationValid_rec(valid_operations: String[], operation:any): boolean{

    if(operation.type == "pattern"){
      return true;
    }

    if(!valid_operations.includes(operation.type)){
      return false;
    }

    if(Array.isArray(operation.input)){
      for(var inputIndex in operation.input){
        if(!this.isOperationValid_rec(valid_operations, operation.input[inputIndex])) return false;
      }
    } else {
      if(!this.isOperationValid_rec(valid_operations, operation.input)) return false;
    }

    return true;
  }

  private isOperationValid(valid_operations: String[], action:any){
    return this.isOperationValid_rec(valid_operations, action.operation)
  }

  public async test(action: IActionQueryOperation): Promise<IActorTest> {
    const available_operations = ["pattern", "join", "union", "filter", "project"]
    if(!this.isOperationValid(available_operations, action)){
      console.log(action)
      throw new Error(`${this.name} is not able to process ${action.operation.type} operations`);
    };
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

    const query: string = this.subQueryFromAction(action.operation)
    
    return this.executeQuery(endpoint, query!, false, variables, canContainUndefs);
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


  public subQueryFromAction(action: any){

    var subQuery: string = "SELECT * WHERE {";

    subQuery += this._subQueryFromActionRec(action);

    subQuery += "}";

    return subQuery
  }

  private _subQueryFromActionRec(action:any) {
    switch (action.type) {
      case "join": {
        return this._subQueryJoin(action);
      }
      case "pattern": {
        return this._subQueryPattern(action);
      }
      case "project": {
        return this._subQueryProject(action);
      }
      case "union": {
        return this._subQueryUnion(action);
      }
      case "filter": {
        return this._subQueryFilter(action);
      }
    }
  }

  private _subQueryFilter(action: any): string{
    var stringQuery: string = "";
    
    stringQuery += this._subQueryFromActionRec(action.input)

    stringQuery += "FILTER(";

    action.expression.args[0].term.termType = "variable" ? stringQuery += "?" : stringQuery += "";
    stringQuery += action.expression.args[0].term.value;

    stringQuery += action.expression.operator;

    action.expression.args[1].term.termType = "variable" ? stringQuery += "?" : stringQuery += "";
    stringQuery += action.expression.args[1].term.value;

    stringQuery += ")";

    return stringQuery;
  }

  private _subQueryUnion(action: any): string{
    var stringQuery: string = "";

    stringQuery += "{";

    stringQuery += this._subQueryFromActionRec(action.input[0])

    stringQuery += "}"

    stringQuery += "UNION"

    stringQuery += "{"

    stringQuery += this._subQueryFromActionRec(action.input[1])

    stringQuery += "}"

    return stringQuery;
  }

  private _subQueryProject(action: any): string{
    var stringQuery: string = "";

    stringQuery += "{ ";

    stringQuery += this.subQueryFromAction(action.input)

    stringQuery += "}"

    return stringQuery;
  }

  private _subQueryJoin(action: any): string{
    var stringQuery: string = "";

    action.input.forEach((inp: any) => {

      stringQuery += this._subQueryFromActionRec(inp)

    });
    
    return stringQuery;
  }

  private _subQueryPattern(action: IActionQueryOperation){
    var stringQuery: string = "";

    stringQuery += this._inputToQueryPatternString(action)

    return stringQuery;
  }

  private _inputToQueryPatternString(input: any) {
    var q = "";

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

  public async executeQuery(
    endpoint: string, 
    query: string, 
    quads: boolean, 
    variables: RDF.Variable[] | undefined, 
    canContainUndefs: boolean
    ): Promise<IQueryOperationResult>{

    var [resultIterator, newNextLink] = await this.getResultIteratoroAndNextLink(endpoint, query, quads);
    var temp;
    var preemption_iterator = 0;

    while(newNextLink != ""){
      preemption_iterator++
      [temp, newNextLink] = await this.getResultIteratoroAndNextLink(endpoint, query, quads, newNextLink);
      resultIterator = new LazyCardinalityIterator(resultIterator.append(temp));
    }

    console.log(preemption_iterator)

    const metadata: () => Promise<IMetadata<any>> = ActorQueryOperationSparqlEndpoint.cachifyMetadata(
      async() => ({
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: await resultIterator.getCardinality() },
        canContainUndefs,
        variables,
      }),
    );

    if (quads) {
      return <IQueryOperationResultQuads> {
        type: 'quads',
        quadStream: resultIterator,
        metadata,
      };
    }
    return <IQueryOperationResultBindings> <unknown> {
      type: 'bindings',
      bindingsStream: <AsyncIterator<any>> <unknown>resultIterator,
      metadata,
    };
    
  }


  private async getResultIteratoroAndNextLink(endpoint: string, query: string, quads: boolean, nextLink:string = ""): Promise<[LazyCardinalityIterator<any>, string]>{
    const [inputStream, newNextLink]: [NodeJS.EventEmitter, string] = await this.endpointFetcher.sageFetch(endpoint, query, quads, nextLink);

    const stream = wrap<any>(inputStream, { autoStart: false }).map(rawData => {
      if(quads){
        return rawData;
      } else {
        return BF.bindings(Object.entries(rawData).map(([key, value]: [string, RDF.Term]) => {
          return [DF.variable(key), value]
        }))
      }
    });

    const resultStream = new LazyCardinalityIterator(stream);
    return [resultStream, newNextLink];
  }
}


export interface IActorQueryOperationCustomEndpointArgs
  extends IActorArgs<IActionQueryOperation, IActorTest, IQueryOperationResult> {

    /**
   * The HTTP mediator
   */
  mediatorHttp: MediatorHttp;
}


