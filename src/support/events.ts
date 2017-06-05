export function getAbsolutePosition(evt: MouseEvent, horizontal?: boolean): number;
export function getAbsolutePosition(evt: TouchEvent, horizontal?: boolean): number;
export function getAbsolutePosition(evt: MouseEvent & TouchEvent, horizontal?: boolean): number {
	return evt.type === 'touchstart' ?
		horizontal ? evt.changedTouches[0].screenX : evt.changedTouches[0].screenY :
		horizontal ? evt.pageX : evt.pageY;
}
