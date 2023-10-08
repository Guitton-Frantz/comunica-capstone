import { Bus } from '@comunica/core';
import { ActorRdfResolveQuadPatternCustom } from '../lib/ActorRdfResolveQuadPatternCustom';

describe('ActorRdfResolveQuadPatternCustom', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfResolveQuadPatternCustom instance', () => {
    let actor: ActorRdfResolveQuadPatternCustom;

    beforeEach(() => {
      actor = new ActorRdfResolveQuadPatternCustom({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
