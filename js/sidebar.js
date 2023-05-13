export default class Sidebar {
  constructor() {
    this.inputImage = null;
  }

  init(inputImage) {
    // SIDE BAR HIDESHOW
    const hideshow = document.getElementById('hideshow');
    const sidebar = document.getElementById('sidebar');
    let saveWidth = 0;
    hideshow.addEventListener('click', () => {
      const box = hideshow.getBoundingClientRect();
      sidebar.style.transition = 'width 0.25s ease-in';
      if (box.left <= 1) {
        if (saveWidth > 0) {
          sidebar.style.width = `${saveWidth}px`;
        } else {
          sidebar.style.width = '17.6rem';
        }
      } else {
        saveWidth = sidebar.clientWidth;
        sidebar.style.width = '0';
      }
      sidebar.ontransitionend = () => {
        sidebar.style.transition = '';
      };
    });
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        const box = hideshow.getBoundingClientRect();
        if (box.left <= 1) {
          hideshow.innerHTML = '<i class="gg-chevron-right"></i>';
        } else {
          hideshow.innerHTML = '<i class="gg-chevron-left"></i>';
        }
      });
    });
    const config = { attributes: true, attributeFilter: ['style'] };
    observer.observe(sidebar, config);

    // RESIZE DRAG
    const resizeSidebar = document.getElementById('resize-sidebar');
    let offsetX;

    function onMouseMoveSidebar(e) {
      const newWidth = e.clientX - offsetX;
      sidebar.style.width = `${newWidth}px`;
    }

    function onTouchMoveSidebar(e) {
      const newWidth = e.touches[0].clientX - offsetX;
      sidebar.style.width = `${newWidth}px`;
    }

    function onMouseUpSidebar() {
      document.removeEventListener('mousemove', onMouseMoveSidebar);
      document.removeEventListener('mouseup', onMouseUpSidebar);
    }

    function onTouchEndSidebar() {
      document.removeEventListener('touchmove', onTouchMoveSidebar);
      document.removeEventListener('touchend', onTouchEndSidebar);
    }

    function resizeSidebarHandler(e) {
      e.preventDefault();
      offsetX = e.clientX - sidebar.clientWidth;
      document.addEventListener('mousemove', onMouseMoveSidebar);
      document.addEventListener('mouseup', onMouseUpSidebar);
    }

    function resizeSidebarTouchHandler(e) {
      e.preventDefault();
      offsetX = e.touches[0].clientX - sidebar.clientWidth;
      document.addEventListener('touchmove', onTouchMoveSidebar);
      document.addEventListener('touchend', onTouchEndSidebar);
    }

    resizeSidebar.addEventListener('mousedown', resizeSidebarHandler);
    resizeSidebar.addEventListener('touchstart', resizeSidebarTouchHandler);

    // Dropzone

    const dropZone = document.getElementById('drop-zone');

    // Create a hidden file input element for images only
    const imageFileInput = document.createElement('input');
    imageFileInput.type = 'file';
    imageFileInput.accept = 'image/*'; // Accept only image files
    imageFileInput.style.display = 'none';

    document.body.appendChild(imageFileInput);

    // Handle file input change events
    imageFileInput.addEventListener('change', () => {
      const file = imageFileInput.files[0];
      handleFile(file);
    });

    // Add click event listener to drop zone
    dropZone.addEventListener('click', () => {
      // Trigger the file input dialog
      imageFileInput.click();
    });


    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    function handleFile(file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          inputImage.src = event.target.result;
          console.log('Image loaded:', inputImage);
        };
        reader.readAsDataURL(file);
      } else {
        alert('Please drop an image file.');
      }
    }

    function handleDrop(e) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', handleDrop, false);

    // Save Load Open
    const saveLoadButton = document.getElementById('save-load-open');
    const saveModal = document.getElementById('save-modal');

    saveLoadButton.addEventListener('click', () => {
      saveModal.style.display = 'block';
    });
  }
}
