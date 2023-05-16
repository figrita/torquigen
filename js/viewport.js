export default class Viewport {
  wc = document.getElementById('webgl-canvas');
  viewport = document.getElementById('viewport');
  controls = document.querySelector('.viewport-controls');
  rendering = document.getElementById('image-rendering');
  wpz = panzoom(this.wc, {
    maxZoom: 10,
    minZoom: 0.1,
    smoothScroll: false,
  });
  zoomSlider = document.getElementById('viewport-zoom-slider');
  zoomReset = document.querySelector('.viewport-zoom-reset');
  positionReset = document.querySelector('.viewport-position-reset');
  resizeViewport = document.getElementById('resize-viewport');
  hideshow = document.getElementById('hideshowtimeline');
  saveHeight = 0;

  constructor() {
    this.addEventListeners();
    this.createObserver();
  }

  addEventListeners = () => {
    this.zoomSlider.addEventListener('input', this.zoomInput);
    this.zoomReset.addEventListener('click', this.resetZoom);
    this.positionReset.addEventListener('click', this.resetPosition);
    this.wpz.on('zoom', this.zoomUpdate);
    this.rendering.addEventListener('change', this.changeRendering);
    this.resizeViewport.addEventListener('mousedown', this.resizeViewportHandler);
    this.resizeViewport.addEventListener('touchstart', this.resizeViewportTouchHandler);
    this.hideshow.addEventListener('click', this.hideshowHandler);
    this.hideshow.addEventListener('touchstart', this.hideshowHandler);
    this.controls.addEventListener('touchstart', (e) => {e.stopPropagation()}, { passive: false });
    this.controls.addEventListener('mousedown', (e) => {e.stopPropagation()}, { passive: false });
    this.controls.addEventListener('click', (e) => {e.stopPropagation()}, { passive: false });
    this.controls.addEventListener('dblclick', (e) => {e.stopPropagation()}, { passive: false });
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

  onMouseMoveViewport = (e) => {
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

  init = () => {
    const wcRect = this.wc.getBoundingClientRect();
    const parentRect = this.wc.parentElement.getBoundingClientRect();
    const cx = parentRect.width / 2 - wcRect.width / 2;
    const cy = parentRect.height / 2 - wcRect.height / 2;
    this.wpz.moveTo(cx, cy);
  }
}
