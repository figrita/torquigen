export default class Viewport {
  constructor() {
    this.wc = document.getElementById('webgl-canvas');
    this.viewport = document.getElementById('viewport');
    this.controls = document.querySelector('.viewport-controls');
    this.rendering = document.getElementById('image-rendering');
    this.wpz = panzoom(this.wc, {
      maxZoom: 10,
      minZoom: 0.1,
      smoothScroll: false,
      beforeMouseDown: this.beforeMouseDown.bind(this),
      beforeClick: this.beforeClick.bind(this),
    });
    this.zoomSlider = document.getElementById('viewport-zoom-slider');
    this.zoomReset = document.querySelector('.viewport-zoom-reset');
    this.positionReset = document.querySelector('.viewport-position-reset');
    this.resizeViewport = document.getElementById('resize-viewport');
    this.hideshow = document.getElementById('hideshowtimeline');
    this.saveHeight = 0;

    this.addEventListeners();
    this.createObserver();
  }

  beforeMouseDown = (e) => {
    const viewportRect = this.viewport.getBoundingClientRect();
    let shouldIgnore = false;
    if (e.clientX > viewportRect.right - 20 && e.clientY > viewportRect.bottom - 20) {
      shouldIgnore = true;
    }
    if (this.controls.contains(e.target)) {
      return true;
    }
    return shouldIgnore;
  }

  beforeClick = (e) => {
    return this.beforeMouseDown(e);
  }

  addEventListeners = () => {
    this.zoomSlider.addEventListener('input', this.zoomInput.bind(this));
    this.zoomReset.addEventListener('click', this.resetZoom.bind(this));
    this.positionReset.addEventListener('click', this.resetPosition.bind(this));
    this.wpz.on('zoom', this.zoomUpdate.bind(this));
    this.rendering.addEventListener('change', this.changeRendering.bind(this));
    this.resizeViewport.addEventListener('mousedown', this.resizeViewportHandler);
    this.resizeViewport.addEventListener('touchstart', this.resizeViewportTouchHandler);
    this.hideshow.addEventListener('click', this.hideshowHandler.bind(this));
    this.hideshow.addEventListener('touchstart', this.hideshowHandler.bind(this));
  }

  zoomInput = (event) => {
    const wcRect = this.wc.getBoundingClientRect();
    const parentRect = this.wc.parentElement.getBoundingClientRect();
    const x = wcRect.left - parentRect.left + wcRect.width / 2;
    const y = wcRect.top - parentRect.top + wcRect.height / 2;
    this.wpz.zoomAbs(x, y, event.target.value);
    this.zoomSlider.nextElementSibling.innerHTML = event.target.value;
  }
  
  resetZoom = () => {
    const wcRect = this.wc.getBoundingClientRect();
    const parentRect = this.wc.parentElement.getBoundingClientRect();
    let x = wcRect.left - parentRect.left + wcRect.width / 2;
    let y = wcRect.top - parentRect.top + wcRect.height / 2;
    if (this.wpz.getTransform().scale > 1.0) {
      const cx = parentRect.width / 2;
      const cy = parentRect.height / 2;
      x = Math.max(Math.min(x, parentRect.width), 0);
      y = Math.max(Math.min(y, parentRect.height), 0);
      x = (x + cx * 5) / 6;
      y = (y + cy * 5) / 6;
    }
    this.wpz.smoothZoomAbs(x, y, 1);
    this.zoomSlider.nextElementSibling.innerHTML = '1.0';
  }
  
  resetPosition = () => {
    const wcRect = this.wc.getBoundingClientRect();
    const parentRect = this.wc.parentElement.getBoundingClientRect();
    const cx = parentRect.width / 2 - wcRect.width / 2;
    const cy = parentRect.height / 2 - wcRect.height / 2;
    this.wpz.smoothMoveTo(cx, cy);
  }
  
  zoomUpdate = (e) => {
    const value = (e.getTransform().scale).toFixed(1);
    this.zoomSlider.value = value;
    this.zoomSlider.nextElementSibling.innerHTML = value;
  }
  
  changeRendering = (event) => {
    const { value } = event.target;
    this.wc.style.imageRendering = value;
  }
  
resizeViewportHandler = (e) => {
  e.preventDefault();
  this.offsetY = e.clientY - this.viewport.clientHeight;
  document.addEventListener('mousemove', this.onMouseMoveViewport);
  document.addEventListener('mouseup', this.onMouseUpViewport);
};

resizeViewportTouchHandler = (e) => {
  e.preventDefault();
  this.offsetY = e.touches[0].clientY - this.viewport.clientHeight;
  document.addEventListener('touchmove', this.onTouchMoveViewport);
  document.addEventListener('touchend', this.onTouchEndViewport);
}

  onMouseMoveViewport =  (e) => {
    const newHeight = e.clientY - this.offsetY;
    this.viewport.style.height = `${newHeight}px`;
  }
  
  onTouchMoveViewport = (e) => {
    const newHeight = e.touches[0].clientY - this.offsetY;
    this.viewport.style.height = `${newHeight}px`;
  }
  
  onMouseUpViewport = () => {
    document.removeEventListener('mousemove', this.onMouseMoveViewport);
    document.removeEventListener('mouseup', this.onMouseUpViewport);
  }
  
  onTouchEndViewport = () => {
    document.removeEventListener('touchmove', this.onTouchMoveViewport);
    document.removeEventListener('touchend', this.onTouchEndViewport);
  }
  
  
  hideshowHandler = () => {
    const box = this.hideshow.getBoundingClientRect();
    this.viewport.style.transition = 'height 0.25s ease-in';
    if (box.bottom >= window.innerHeight - 3) {
      if (this.saveHeight > 0) {
        this.viewport.style.height = `${this.saveHeight}px`;
      } else {
        this.viewport.style.height = 'calc(100vh - 20rem)';
      }
    } else {
      this.saveHeight = this.viewport.clientHeight;
      this.viewport.style.height = '100vh';
    }
    this.viewport.ontransitionend = () => {
      this.viewport.style.transition = '';
    };
  }
  
  createObserver = () => {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        const box = this.hideshow.getBoundingClientRect();
        if (box.bottom >= window.innerHeight - 3) {
          this.hideshow.innerHTML = '<i class="gg-chevron-up"></i>';
        } else {
          this.hideshow.innerHTML = '<i class="gg-chevron-down"></i>';
        }
      });
    });
  
    const config = { attributes: true, attributeFilter: ['style'] };
    this.observer.observe(this.viewport, config);
  }
  
  enableBottomTouch = (parentDiv, childDiv, touchAreaHeight) => {
    childDiv.addEventListener('touchstart', function(event) {
      event.stopPropagation();
    }, {passive: false});
  }
  

  init = () =>  {
    const wcRect = this.wc.getBoundingClientRect();
    const parentRect = this.wc.parentElement.getBoundingClientRect();
    const cx = parentRect.width / 2 - wcRect.width / 2;
    const cy = parentRect.height / 2 - wcRect.height / 2;
    this.wpz.moveTo(cx, cy);
  }
}
