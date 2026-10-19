// A narrow WebKit fallback supplements touch-action. It never owns movement or
// fires shots; Pointer Events remain the sole game-input path.
export class GameGestures {
  constructor(surface) {
    this.surface=surface; this.active=false; this.touches=new Set();
    this.nativeButton=event=>!!event.target?.closest?.('[data-native-tap]');
    this.start=event=>{
      if(this.active&&!this.nativeButton(event))for(const touch of event.changedTouches || [])this.touches.add(touch.identifier);
    };
    this.move=event=>{if(this.active&&!this.nativeButton(event)&&event.cancelable)event.preventDefault();};
    this.end=event=>{
      let owned=false;
      for(const touch of event.changedTouches || []) {
        if(this.touches.delete(touch.identifier))owned=true;
      }
      // Includes the final shot whose pointer event may have opened results.
      if((owned || (this.active&&!this.nativeButton(event)))&&event.cancelable)event.preventDefault();
    };
    this.gesture=event=>{if(this.active&&event.cancelable)event.preventDefault();};
    this.events=[['touchstart',this.start],['touchmove',this.move],['touchend',this.end],['touchcancel',this.end],
      ['gesturestart',this.gesture],['gesturechange',this.gesture],['gestureend',this.gesture],['dblclick',this.gesture]];
    this.events.forEach(([type,handler])=>surface.addEventListener(type,handler,{passive:false}));
  }
  setActive(active) {
    this.active=active;
    if(active)this.touches.clear();
    this.surface.classList.toggle('playing',active);
  }
  dispose() {
    this.setActive(false);this.touches.clear();
    this.events.forEach(([type,handler])=>this.surface.removeEventListener(type,handler));
  }
}
