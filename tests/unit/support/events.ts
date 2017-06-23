import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { getAbsolutePosition } from '../../../src/support/events';

registerSuite({
	name: 'support/events',

	'getAbsolutePosition()': {
		'MouseEvent'() {
			assert.strictEqual(getAbsolutePosition({
				type: 'mousedown',
				pageX: 5,
				pageY: 10
			} as MouseEvent), 10);
		},

		'MouseEvent - horizontal'() {
			assert.strictEqual(getAbsolutePosition({
				type: 'mouseup',
				pageX: 5,
				pageY: 10
			} as MouseEvent, true), 5);
		},

		'TouchEvent'() {
			assert.strictEqual(getAbsolutePosition({
				type: 'touchstart',
				changedTouches: [ {
					screenX: 5,
					screenY: 10
				} ]
			} as any as TouchEvent), 10);
		},

		'TouchEvent - horizontal'() {
			assert.strictEqual(getAbsolutePosition({
				type: 'touchend',
				changedTouches: [ {
					screenX: 5,
					screenY: 10
				} ]
			} as any as TouchEvent, true), 5);
		}
	}
});
