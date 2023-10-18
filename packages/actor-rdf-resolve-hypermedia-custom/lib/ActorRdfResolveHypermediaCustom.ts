import { RdfJsQuadSource } from '@comunica/actor-rdf-resolve-quad-pattern-rdfjs-source';
import { ActorRdfResolveHypermedia, 
  IActionRdfResolveHypermedia, 
  IActorRdfResolveHypermediaOutput, 
  IActorRdfResolveHypermediaArgs, IActorRdfResolveHypermediaTest } from '@comunica/bus-rdf-resolve-hypermedia';
import { IActorArgs, IActorTest } from '@comunica/core';
import { Stream, Quad } from 'rdf-js';
import { storeStream } from 'rdf-store-stream';

/**
 * A comunica Custom RDF Resolve Hypermedia Actor.
 */
export class ActorRdfResolveHypermediaCustom extends ActorRdfResolveHypermedia {
  public async testMetadata(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaTest> {
    console.log("custom testMetadata()");
    return {filterFactor : 1};
  }
  public constructor(args: IActorRdfResolveHypermediaArgs) {
    console.log("custom constructor");
    super(args, 'custom');
  }

  public async run(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaOutput> {
    console.log("custom run()")
    return { source: new RdfJsQuadSource(await storeStream(action.quads)) };
    //stolen from ActorRdfResolveHypermediaNone
  }
}

