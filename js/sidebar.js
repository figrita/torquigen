export default class Sidebar {
  hideshow = document.getElementById('hideshow');
  sidebar = document.getElementById('sidebar');
  saveWidth = 0;
  resizeSidebar = document.getElementById('resize-sidebar');
  offsetX = null;
  dropZone = document.getElementById('drop-zone');
  saveLoadButton = document.getElementById('save-load-open');
  saveModal = document.getElementById('save-modal');

  constructor() {
    this.inputImage = null;
  }

  init(inputImage) {
    this.inputImage = inputImage;
    this.addEventListeners();
    this.createObserver();
  }

  addEventListeners = () => {
    this.hideshow.addEventListener('click', this.hideshowHandler);
    this.resizeSidebar.addEventListener('mousedown', this.resizeSidebarHandler);
    this.resizeSidebar.addEventListener('touchstart', this.resizeSidebarTouchHandler);
    this.dropZone.addEventListener('click', this.triggerImageFileInput);
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, this.preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, () => this.dropZone.classList.add('dragover'), false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, () => this.dropZone.classList.remove('dragover'), false);
    });
    this.dropZone.addEventListener('drop', this.handleDrop, false);
    this.saveLoadButton.addEventListener('click', this.showModal);
  }

  hideshowHandler = () => {
    const box = this.hideshow.getBoundingClientRect();
    this.sidebar.style.transition = 'width 0.25s ease-in';
    if (box.left <= 1) {
      if (this.saveWidth > 0) {
        this.sidebar.style.width = `${this.saveWidth}px`;
      } else {
        this.sidebar.style.width = '17.6rem';
      }
    } else {
      this.saveWidth = this.sidebar.clientWidth;
      this.sidebar.style.width = '0';
    }
    this.sidebar.ontransitionend = () => {
      this.sidebar.style.transition = '';
    };
  }

  createObserver = () => {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(() => {
        const box = this.hideshow.getBoundingClientRect();
        if (box.left <= 1) {
          this.hideshow.innerHTML = '<i class="gg-chevron-right"></i>';
        } else {
          this.hideshow.innerHTML = '<i class="gg-chevron-left"></i>';
        }
      });
    });
    const config = { attributes: true, attributeFilter: ['style'] };
    observer.observe(this.sidebar, config);
  }

  resizeSidebarHandler = e => {
    e.preventDefault();
    this.offsetX = e.clientX - this.sidebar.clientWidth;
    document.addEventListener('mousemove', this.onMouseMoveSidebar);
    document.addEventListener('mouseup', this.onMouseUpSidebar);
  }

  resizeSidebarTouchHandler = e => {
    e.preventDefault();
    this.offsetX = e.touches[0].clientX - this.sidebar.clientWidth;
    document.addEventListener('touchmove', this.onTouchMoveSidebar);
    document.addEventListener('touchend', this.onTouchEndSidebar);
  }

  onMouseMoveSidebar = e => {
    const newWidth = e.clientX - this.offsetX;
    this.sidebar.style.width = `${newWidth}px`;
  }

  onTouchMoveSidebar = e => {
    const newWidth = e.touches[0].clientX - this.offsetX;
    this.sidebar.style.width = `${newWidth}px`;
  }

  onMouseUpSidebar = () => {
    document.removeEventListener('mousemove', this.onMouseMoveSidebar);
    document.removeEventListener('mouseup', this.onMouseUpSidebar);
  }

  onTouchEndSidebar = () => {
    document.removeEventListener('touchmove', this.onTouchMoveSidebar);
    document.removeEventListener('touchend', this.onTouchEndSidebar);
  }

  triggerImageFileInput = () => {
    const imageFileInput = this.createImageFileInput();
    imageFileInput.click();
  }

  createImageFileInput = () => {
    const imageFileInput = document.createElement('input');
    imageFileInput.type = 'file';
    imageFileInput.accept = 'image/*'; // Accept only image files
    imageFileInput.style.display = 'none';
    document.body.appendChild(imageFileInput);
    imageFileInput.addEventListener('change', () => {
      const file = imageFileInput.files[0];
      this.handleFile(file);
    });
    return imageFileInput;
  }

  preventDefaults = e => {
    e.preventDefault();
    e.stopPropagation();
  }

  handleFile = file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = event => {
        this.inputImage.src = event.target.result;
        console.log('Image loaded:', this.inputImage);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please drop an image file.');
    }
  }

  handleDrop = e => {
    const file = e.dataTransfer.files[0];
    this.handleFile(file);
  }

  showModal = () => {
    this.saveModal.style.display = 'block';
  }
}