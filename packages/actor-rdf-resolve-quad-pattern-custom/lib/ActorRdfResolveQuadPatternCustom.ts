import {
  ActorRdfResolveQuadPattern,
  IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternArgs,
  IActorRdfResolveQuadPatternOutput,
  MediatorRdfResolveQuadPattern
} from '@comunica/bus-rdf-resolve-quad-pattern';
import { IActorTest } from '@comunica/core';
import { ArrayIterator, EmptyIterator, SingletonIterator } from 'asynciterator';
import { DataFactory, Quad } from 'rdf-data-factory';
import type * as RDF from '@rdfjs/types';
import { MediatorRdfParseHandle } from '@comunica/bus-rdf-parse';

/**
 * A comunica Custom RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternCustom extends ActorRdfResolveQuadPattern {
  public readonly mediatorRdfParse: MediatorRdfParseHandle;
  public readonly mediatorRdfResolveQuadPattern: MediatorRdfResolveQuadPattern;
  public constructor(args: IActorRdfResolveQuadPatternArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    return true; // TODO implement
  }

  public async run(action: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
    var q = "SELECT * WHERE { "

    if(action.pattern.subject.termType == 'Variable'){
      q += '?'
      q += action.pattern.subject.value
    } else {
      q += '<'
      q += action.pattern.subject.value
      q += '>'
    }
    q += ' '

    if(action.pattern.predicate.termType == 'Variable'){
      q += '?'
      q += action.pattern.predicate.value
    }else {
      q += '<'
      q += action.pattern.predicate.value
      q += '>'
    }
    q += ' '

    if(action.pattern.object.termType == 'Variable'){
      q += '?'
      q += action.pattern.object.value
    }else {
      q += '<'
      q += action.pattern.object.value
      q += '>'
    }
    q += ' '

    q += '}'

    //console.log("query", q)
    var url = "http://localhost:3030/dummy/sparql"
    let fetchData = {
        "headers": {
            "Accept": "application/sparql-results+json,*/*;q=0.9",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        "body": "query=" + q,
        "method": "POST"
    }

    const response = fetch(url, fetchData)
        .then((res)=>{
            var json = res.json()
            return json
        })
        .then((json)=>{
            //console.log("json", json)
            return json
        })
    
    const res = await response
    //console.log("first binding", res["results"]["bindings"][0])
    
    var quads = [];
    quads = await this.bindingsToQuads(res, action);
    var data = new ArrayIterator<RDF.Quad>(quads);
    
    data.setProperty('metadata', { cardinality: res["results"]["bindings"].length });
    return { data }; // TODO implement
  }

  private async bindingsToQuads(res: any, action: IActionRdfResolveQuadPattern) {
    var quads = []
    const df = new DataFactory();
    for (var i = 0; i < res["results"]["bindings"].length; i++) {
      var quad = this.bindingToQuad(action, res, i, df);
      //console.log(quad.subject, quad.predicate, quad.object)
      quads.push(quad)
    }

    return quads
  }

  private bindingToQuad(action: IActionRdfResolveQuadPattern, res: any, i: number, df: DataFactory) {
    var variable_count = 0;
    var key = "";

    var subject;
    if (action.pattern.subject.termType == 'Variable') {
      key = Object.keys(res["results"]["bindings"][i])[variable_count];
      variable_count++;
      subject = df.namedNode(res["results"]["bindings"][i][key].value);
    } else {
      subject = df.variable(action.pattern.subject.value);
    }

    var predicate;
    if (action.pattern.predicate.termType == 'Variable') {
      
      key = Object.keys(res["results"]["bindings"][i])[variable_count];
      variable_count++;
      predicate = df.namedNode(res["results"]["bindings"][i][key].value);
    } else {
      predicate = df.variable(action.pattern.predicate.value);
    }

    var object;
    if (action.pattern.object.termType == 'Variable') {
      key = Object.keys(res["results"]["bindings"][i])[variable_count];
      variable_count++;
      object = df.namedNode(res["results"]["bindings"][i][key].value);
    } else {
      object = df.variable(action.pattern.object.value);
    }
    return df.quad(
      subject,
      predicate,
      object
    );
  }
}
