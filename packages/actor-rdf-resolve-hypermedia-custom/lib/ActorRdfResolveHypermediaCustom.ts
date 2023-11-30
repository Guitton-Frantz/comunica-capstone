import { RdfJsQuadSource } from '@comunica/actor-rdf-resolve-quad-pattern-rdfjs-source';
import { ActorRdfResolveHypermedia, 
  IActionRdfResolveHypermedia, 
  IActorRdfResolveHypermediaOutput, 
  IActorRdfResolveHypermediaArgs, IActorRdfResolveHypermediaTest } from '@comunica/bus-rdf-resolve-hypermedia';
import { IActorArgs, IActorTest } from '@comunica/core';
import { IActionContext } from '@comunica/types';
import { Stream, Quad } from 'rdf-js';
import { storeStream } from 'rdf-store-stream';
import { RdfSourceQpf } from '../../actor-rdf-resolve-hypermedia-qpf/lib/RdfSourceQpf';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Custom RDF Resolve Hypermedia Actor.
 */
export class ActorRdfResolveHypermediaCustom extends ActorRdfResolveHypermedia {
  mediatorMetadata: any;
  mediatorMetadataExtract: any;
  mediatorDereferenceRdf: any;
  subjectUri: any;
  predicateUri: any;
  objectUri: any;
  graphUri: any;
  public async testMetadata(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaTest> {
    console.log("custom testMetadata()");
    return {filterFactor : 1};
  }
  public constructor(args: IActorRdfResolveHypermediaArgs) {
    console.log("custom constructor");
    super(args, 'custom');
  }

  public async run(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaOutput> {
    this.logInfo(action.context, `Identified as custom source: ${action.url}`);
    console.log(`Identified as custom source: ${action.url}`)
    const source = this.createSource(action.url, action.metadata, action.context, action.quads);
    return { source, dataset: source.searchForm.dataset };
  }

  protected createSource(
    url: string,
    metadata: Record<string, any>,
    context: IActionContext,
    quads?: RDF.Stream,
  ): RdfSourceQpf {
    return new RdfSourceQpf(
      this.mediatorMetadata,
      this.mediatorMetadataExtract,
      this.mediatorDereferenceRdf,
      this.subjectUri,
      this.predicateUri,
      this.objectUri,
      this.graphUri,
      url,
      metadata,
      context,
      quads,
    );
  }
}

