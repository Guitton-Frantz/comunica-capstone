import {
  ActorRdfResolveQuadPattern,
  IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternArgs,
  IActorRdfResolveQuadPatternOutput
} from '@comunica/bus-rdf-resolve-quad-pattern';
import { IActorTest } from '@comunica/core';
import * as DataFactory from 'rdf-data-factory';
import { EmptyIterator, SingletonIterator } from 'asynciterator';
import * as RDF from 'rdf-js';

/**
 * A comunica Custom RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternCustom extends ActorRdfResolveQuadPattern {
  public constructor(args: IActorRdfResolveQuadPatternArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    //This function is meant to be called by the bus, as a way to ensure that this actor ("Custom") is able to process
    //the fetching of quad patterns

    //I don't yet understand what kind of errors are supposed to be caught here, so test() returns true for now :)
    console.log("Custom test() Notification")
    return true; // TODO implement
  }

  public async run(action: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
  

    var q = "SELECT * WHERE { ?s ?p ?o }"
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
            var usable = res.json()
            return usable
        })
        .then((usable)=>{
            console.log(usable["results"]["bindings"][0])
            
            console.log("data formed")
            return usable["results"]["bindings"][0]
        })
    
    const res = await response
    console.log(res)
    const data = new EmptyIterator<RDF.Quad>()
    console.log("empty because that's it")
    data.setProperty('metadata', { totalItems: 1, cardinality: 1 });
    return { data }; // TODO implement
  }
}
