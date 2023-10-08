import { ActorRdfResolveQuadPattern, IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput, IActorRdfResolveQuadPatternArgs } from '@comunica/bus-rdf-resolve-quad-pattern';
import { IActorArgs, IActorTest } from '@comunica/core';
import { EmptyIterator } from 'asynciterator';
import { Console } from 'console';
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
    return true; // TODO implement
  }

  public async run(action: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
    
    console.log("YOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO")
    console.log(action.pattern)

    const httpQueryHeader = {
      method: "GET",
      query: "SELECT * FROM {" + action.pattern.subject + " " + action.pattern.predicate + " " + action.pattern.object + "}"
    }

    const response = await fetch('http://localhost:3030/#/dataset/dummy/query')

    console.log("response")
    console.log(response)

    const data = new EmptyIterator<RDF.Quad>();
    data.setProperty('metadata', { totalItems: Infinity });
    return { data }; // TODO implement
  }
}
