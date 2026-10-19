export const HOME_SCREEN_HELP='On iPhone: open this link in Safari, then Share → Add to Home Screen. Enable Open as Web App if shown, tap Add, and launch KPM from the Home Screen. Sign in again if asked. Browser tabs may keep their toolbars; the game cannot force them away.';

export class ImmersiveMode {
  constructor({root,button,status,onExit=()=>{},win=window,doc=document}) {
    Object.assign(this,{root,button,status,onExit,win,doc});
    this.pending=false;this.wasFullscreen=false;this.disposed=false;
    this.standaloneQuery=win.matchMedia('(display-mode: standalone)');
    this.change=()=>this.refresh();
    this.click=()=>this.toggle();
    button.addEventListener('click',this.click);
    doc.addEventListener('fullscreenchange',this.change);
    doc.addEventListener('webkitfullscreenchange',this.change);
    this.standaloneQuery.addEventListener?.('change',this.change);
    this.refresh();
  }
  get fullscreen() {return !!(this.doc.fullscreenElement || this.doc.webkitFullscreenElement);}
  get standalone() {return this.standaloneQuery.matches || this.win.navigator?.standalone===true;}
  get request() {
    if(this.doc.fullscreenEnabled!==false && typeof this.root.requestFullscreen==='function')return ()=>this.root.requestFullscreen({navigationUI:'hide'});
    if(this.doc.webkitFullscreenEnabled!==false && typeof this.root.webkitRequestFullscreen==='function')return this.root.webkitRequestFullscreen.bind(this.root);
    return null;
  }
  refresh(message) {
    if(this.disposed)return;
    const fullscreen=this.fullscreen;
    if(this.wasFullscreen&&!fullscreen)this.onExit();
    this.wasFullscreen=fullscreen;
    this.button.hidden=(!this.request || this.standalone)&&!fullscreen;
    this.button.disabled=this.pending;
    this.button.textContent=fullscreen?'Exit fullscreen':'Enter fullscreen';
    this.status.textContent=message || (fullscreen?'Fullscreen is active. Use Exit fullscreen in this panel to leave.'
      :this.standalone?'Home Screen app mode is active. Rotate your phone for more aiming room.'
      :(this.request?'Fullscreen is available in this browser. ':'')+HOME_SCREEN_HELP);
  }
  async toggle() {
    if(this.pending||this.disposed)return;
    const exiting=this.fullscreen;
    const action=exiting?(this.doc.exitFullscreen || this.doc.webkitExitFullscreen)?.bind(this.doc):this.request;
    if(!action){this.refresh();return;}
    this.pending=true;this.refresh();
    try {
      // Call directly from the button gesture; do not consume activation elsewhere.
      await action();
      this.pending=false;
      this.refresh(!exiting&&!this.fullscreen?'Fullscreen was requested but has not opened. '+HOME_SCREEN_HELP:undefined);
    } catch {
      this.pending=false;
      this.refresh('Fullscreen could not change in this browser. '+HOME_SCREEN_HELP);
    }
  }
  dispose() {
    this.disposed=true;
    this.button.removeEventListener('click',this.click);
    this.doc.removeEventListener('fullscreenchange',this.change);
    this.doc.removeEventListener('webkitfullscreenchange',this.change);
    this.standaloneQuery.removeEventListener?.('change',this.change);
  }
}
