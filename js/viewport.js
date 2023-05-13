const wc = document.getElementById('webgl-canvas');
const viewport = document.getElementById('viewport');
const controls = document.querySelector('.viewport-controls');
const rendering = document.getElementById('image-rendering');
const wpz = panzoom(wc, {
  maxZoom: 10,
  minZoom: 0.1,
  smoothScroll: false,
  beforeMouseDown(e) {
    const viewportRect = viewport.getBoundingClientRect();
    let shouldIgnore = false;
    if (e.clientX > viewportRect.right - 20 && e.clientY > viewportRect.bottom - 20) {
      shouldIgnore = true;
    }
    if (controls.contains(e.target)) {
      return true;
    }
    return shouldIgnore;
  },
  beforeClick(e) {
    const viewportRect = viewport.getBoundingClientRect();
    let shouldIgnore = false;
    if (e.clientX > viewportRect.right - 20 && e.clientY > viewportRect.bottom - 20) {
      shouldIgnore = true;
    }
    if (controls.contains(e.target)) {
      return true;
    }
    return shouldIgnore;
  },
});
const zoomSlider = document.getElementById('viewport-zoom-slider');
zoomSlider.addEventListener('input', (event) => {
  const wcRect = wc.getBoundingClientRect();
  const parentRect = wc.parentElement.getBoundingClientRect();
  const x = wcRect.left - parentRect.left + wcRect.width / 2;
  const y = wcRect.top - parentRect.top + wcRect.height / 2;
  wpz.zoomAbs(x, y, event.target.value);
  zoomSlider.nextElementSibling.innerHTML = event.target.value;
});
const zoomReset = document.querySelector('.viewport-zoom-reset');
zoomReset.addEventListener('click', () => {
  const wcRect = wc.getBoundingClientRect();
  const parentRect = wc.parentElement.getBoundingClientRect();

  let x = wcRect.left - parentRect.left + wcRect.width / 2;
  let y = wcRect.top - parentRect.top + wcRect.height / 2;
  if (wpz.getTransform().scale > 1.0) {
    const cx = parentRect.width / 2;
    const cy = parentRect.height / 2;
    x = Math.max(Math.min(x, parentRect.width), 0);
    y = Math.max(Math.min(y, parentRect.height), 0);
    x = (x + cx * 5) / 6;
    y = (y + cy * 5) / 6;
  }
  wpz.smoothZoomAbs(x, y, 1);

  zoomSlider.nextElementSibling.innerHTML = '1.0';
});
const positionReset = document.querySelector('.viewport-position-reset');
positionReset.addEventListener('click', () => {
  const wcRect = wc.getBoundingClientRect();
  const parentRect = wc.parentElement.getBoundingClientRect();
  const cx = parentRect.width / 2 - wcRect.width / 2;
  const cy = parentRect.height / 2 - wcRect.height / 2;
  wpz.smoothMoveTo(cx, cy);
});
wpz.on('zoom', (e) => {
  const value = (e.getTransform().scale).toFixed(1);
  zoomSlider.value = value;
  zoomSlider.nextElementSibling.innerHTML = value;
});
rendering.addEventListener('change', (event) => {
  const { value } = event.target;
  wc.style.imageRendering = value;
});

// RESIZE

const resizeViewport = document.getElementById('resize-viewport');
let offsetY;

function resizeViewportHandler(e) {
  e.preventDefault();
  offsetY = e.clientY - viewport.clientHeight;
  document.addEventListener('mousemove', onMouseMoveViewport);
  document.addEventListener('mouseup', onMouseUpViewport);
}

function resizeViewportTouchHandler(e) {
  e.preventDefault();
  offsetY = e.touches[0].clientY - viewport.clientHeight;
  document.addEventListener('touchmove', onTouchMoveViewport);
  document.addEventListener('touchend', onTouchEndViewport);
}

function onMouseMoveViewport(e) {
  const newHeight = e.clientY - offsetY;
  viewport.style.height = `${newHeight}px`;
}

function onTouchMoveViewport(e) {
  const newHeight = e.touches[0].clientY - offsetY;
  viewport.style.height = `${newHeight}px`;
}

function onMouseUpViewport() {
  document.removeEventListener('mousemove', onMouseMoveViewport);
  document.removeEventListener('mouseup', onMouseUpViewport);
}

function onTouchEndViewport() {
  document.removeEventListener('touchmove', onTouchMoveViewport);
  document.removeEventListener('touchend', onTouchEndViewport);
}

resizeViewport.addEventListener('mousedown', resizeViewportHandler);
resizeViewport.addEventListener('touchstart', resizeViewportTouchHandler);

//  HIDESHOW TIMELINE
const hideshow = document.getElementById('hideshowtimeline');
let saveHeight = 0;
function hideshowHandler() {
  const box = hideshow.getBoundingClientRect();
  viewport.style.transition = 'height 0.25s ease-in';
  if (box.bottom >= window.innerHeight - 3) {
    if (saveHeight > 0) {
      viewport.style.height = `${saveHeight}px`;
    } else {
      viewport.style.height = 'calc(100vh - 20rem)';
    }
  } else {
    saveHeight = viewport.clientHeight;
    viewport.style.height = '100vh';
  }
  viewport.ontransitionend = () => {
    viewport.style.transition = '';
  };
}
hideshow.addEventListener('click', hideshowHandler);
hideshow.addEventListener('touchstart', hideshowHandler);
const observer = new MutationObserver((mutations) => {
  // Loop through the mutations
  mutations.forEach(() => {
    const box = hideshow.getBoundingClientRect();
    if (box.bottom >= window.innerHeight - 3) {
      hideshow.innerHTML = '<i class="gg-chevron-up"></i>';
    } else {
      hideshow.innerHTML = '<i class="gg-chevron-down"></i>';
    }
  });
});

// Configure the observer to watch for changes to the 'style' attribute
const config = { attributes: true, attributeFilter: ['style'] };
observer.observe(viewport, config);






function enableBottomTouch(parentDiv, childDiv, touchAreaHeight) {

  // Attach touch events to the child div as usual
  childDiv.addEventListener('touchstart', function(event) {
      console.log('Child div touched!');
      event.stopPropagation();
  }, {passive: false});
}

// Call the function with the id of the parent and child divs and the height of the touch area
enableBottomTouch(viewport, controls);

// INIT FUNCTION

export function init() {
  const wcRect = wc.getBoundingClientRect();
  const parentRect = wc.parentElement.getBoundingClientRect();
  const cx = parentRect.width / 2 - wcRect.width / 2;
  const cy = parentRect.height / 2 - wcRect.height / 2;
  wpz.moveTo(cx, cy);
}
