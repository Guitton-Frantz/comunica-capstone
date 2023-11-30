import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import { EventTarget } from "event-target-shim";
import * as RDF from "@rdfjs/types";
import { Readable } from "stream";
import * as ReadableWebToNodeStream from "readable-web-to-node-stream"
const sparqljson_parse_1 = require("sparqljson-parse");
const sparqlxml_parse_1 = require("sparqlxml-parse");
const isStream = require('is-stream');
const readable_web_to_node_stream_1 = require("readable-web-to-node-stream");
const n3 = require('n3');

export class SageEndpointFetcher {
    rawHttpResponse: any;
    readonly fetchCb?: (input: Request | string, init?: RequestInit) => Promise<Response>;
    readonly defaultHeaders: Headers;
    readonly method: string;
    readonly additionalUrlParams: URLSearchParams;
    readonly sparqlJsonParser;
    readonly sparqlXmlParser
    readonly sparqlParsers;
    constructor(args: ISageEndpointFetcherArgs){
        this.fetchCb = args.fetch;
        this.defaultHeaders = args.defaultHeaders || new Headers();
        this.method = args.method || 'POST';
        this.additionalUrlParams = args.additionalUrlParams || new URLSearchParams();
        this.sparqlJsonParser = new sparqljson_parse_1.SparqlJsonParser(args);
        this.sparqlXmlParser = new sparqlxml_parse_1.SparqlXmlParser(args);
        this.sparqlParsers = {
            [SparqlEndpointFetcher.CONTENTTYPE_SPARQL_JSON]: {
                parseBooleanStream: (sparqlResponseStream: any) => this.sparqlJsonParser.parseJsonBooleanStream(sparqlResponseStream),
                parseResultsStream: (sparqlResponseStream: any) => this.sparqlJsonParser.parseJsonResultsStream(sparqlResponseStream),
            },
            [SparqlEndpointFetcher.CONTENTTYPE_SPARQL_XML]: {
                parseBooleanStream: (sparqlResponseStream: any) => this.sparqlXmlParser.parseXmlBooleanStream(sparqlResponseStream),
                parseResultsStream: (sparqlResponseStream: any) => this.sparqlXmlParser.parseXmlResultsStream(sparqlResponseStream),
            },
        };
    }

    async sageFetch(endpoint: string, query: string, quads: boolean, nextLink: string): Promise<[NodeJS.EventEmitter, string]>{
        return this.fetchBindings(endpoint, query, nextLink);
    }

    // async fetchTriples(endpoint: string, query: string): Promise<NodeJS.ReadableStream & String>{
    //     const rawStream = (await this.fetchRawStream(endpoint, query, SparqlEndpointFetcher.CONTENTTYPE_TURTLE))[1];
    //     return rawStream.pipe(new n3.StreamParser({ format: SparqlEndpointFetcher.CONTENTTYPE_TURTLE }));
    // }

    async fetchBindings(endpoint: string, query: string, nextLink: string = ""): Promise<[NodeJS.EventEmitter, string]>{
        const [contentType, responseStream, newNextLink] = 
            await this.fetchRawStream(endpoint, query, SparqlEndpointFetcher.CONTENTTYPE_SPARQL, nextLink);
        const parser = this.sparqlParsers[contentType];
        if (!parser) {
            throw new Error('Unknown SPARQL results content type: ' + contentType);
        }

        return [parser.parseResultsStream(responseStream), newNextLink];
    }

    async fetchRawStream(endpoint: string, query: string, acceptHeader: string, nextLink: string) {
        let url = this.method === 'POST' ? endpoint : endpoint + '?query=' + encodeURIComponent(query);
        // Initiate request
        const headers = new Headers(this.defaultHeaders);
        var body: URLSearchParams = new URLSearchParams();
        headers.append('Accept', acceptHeader);

        if (this.method === 'POST') {
            headers.append('Content-Type', 'application/x-www-form-urlencoded');

            body = new URLSearchParams();
            body.set('query', query);

            if(nextLink != "") body.set('sageOutput', nextLink);

            this.additionalUrlParams.forEach((value, key) => {
                body.set(key, value);
            });

            console.log(body);

            headers.append('Content-Length', body.toString().length.toString());
        }
        else if (this.additionalUrlParams.toString() !== '') {
            url += `&${this.additionalUrlParams.toString()}`;
        }

        return await this.handleFetchCall(url, { headers, method: this.method, body }, {}, nextLink);
    }

    async handleFetchCall(url: string | Request, init: RequestInit | undefined, options = {}, nextLink: string) {
        const httpResponse = await (this.fetchCb || fetch)(url, init);
        let responseStream;

        // Handle response body
        //if(!options.ignoreBody){
        var rawResponse = httpResponse.clone();
        var json = await rawResponse.json();
        var newNextLink = json["SageModule"];
        console.log("json: ", json);
        if(newNextLink == undefined) newNextLink = "";

        // Wrap WhatWG readable stream into a Node.js readable stream
        // If the body already is a Node.js stream (in the case of node-fetch), don't do explicit conversion.
        responseStream = isStream(httpResponse.body)
            ? httpResponse.body : new readable_web_to_node_stream_1.ReadableWebToNodeStream(httpResponse.body);

        //}

        // Determine the content type and emit it to the stream
        let contentType = httpResponse.headers.get('Content-Type') || '';
        if (contentType.indexOf(';') > 0) {
            contentType = contentType.substr(0, contentType.indexOf(';'));
        }

        return [contentType, responseStream, newNextLink];
    }

}

export interface ISageEndpointFetcherArgs {
    method?: 'POST' | 'GET';
    additionalUrlParams?: URLSearchParams;
    timeout?: number;
    defaultHeaders?: Headers;
    /**
     * A custom fetch function.
     */
    fetch?: (input: Request | string, init?: RequestInit) => Promise<Response>;
}