/** The user's chosen direction: left = previous, right = next. */
export function swipeDirection(dx:number,dy:number,duration:number):'previous'|'next'|null {
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||duration<0||duration>900||Math.abs(dx)<64||Math.abs(dx)<Math.abs(dy)*1.5)return null;
 return dx<0?'previous':'next';
}
