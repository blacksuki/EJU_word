import {it,expect} from 'vitest';
import {swipeDirection} from '../../src/learning/swipe';
it('maps a deliberate left swipe to previous and right swipe to next',()=>{expect(swipeDirection(-100,8,300)).toBe('previous');expect(swipeDirection(100,-8,300)).toBe('next');});
it('ignores tap jitter, predominantly vertical movement and long held drags',()=>{expect(swipeDirection(20,0,100)).toBeNull();expect(swipeDirection(70,90,300)).toBeNull();expect(swipeDirection(100,0,1500)).toBeNull();});
