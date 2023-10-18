import { Bus } from '@comunica/core';
import { ActorRdfResolveHypermediaCustom } from '../lib/ActorRdfResolveHypermediaCustom';

describe('ActorRdfResolveHypermediaCustom', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfResolveHypermediaCustom instance', () => {
    let actor: ActorRdfResolveHypermediaCustom;

    beforeEach(() => {
      actor = new ActorRdfResolveHypermediaCustom({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
