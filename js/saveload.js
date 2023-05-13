
// SAVE and LOAD
export function init(gui, animator, player, update){
const modal = document.getElementById('save-modal');
const loopLengthSelect = document.getElementById('loop-length');
const btnSave = document.getElementById('btn-save');
const btnLoad = document.getElementById('btn-load');
const btnClose = document.getElementById('btn-close');
const inputSaveAs = document.getElementById('input-save-as');
const btnSaveAs = document.getElementById('btn-save-as');
const btnFileLoad = document.getElementById('btn-file-load');
const inputFileLoad = document.getElementById('input-file-load');
const textareaSave = document.getElementById('textarea-save');

btnSave.addEventListener('click', () => {
    const newSave = {};
    newSave.gui = gui.save();
    newSave.animation = animator.save();
    newSave.length = player.seconds;
    const data = JSON.stringify(newSave);
    textareaSave.value = encodeURI(btoa(data));
});

btnLoad.addEventListener('click', () => {
    const loadStr = textareaSave.value;
    const stringData = atob(decodeURI(loadStr));
    const objectData = JSON.parse(stringData);
    gui.load(objectData.gui);
    animator.load(objectData.animation);
    loopLengthSelect.value = objectData.length;
    player.seconds = objectData.length;
    update();
    modal.style.display = 'none';
});

btnSaveAs.addEventListener('click', () => {
    // Default file name is 'Untitled.torq'
    const fileName = inputSaveAs.value + '.torq';

    const newSave = {};
    newSave.gui = gui.save();
    newSave.animation = animator.save();
    newSave.length = player.seconds;
    const data = JSON.stringify(newSave);
    const encodedData = encodeURI(btoa(data));

    // Create a blob with the data
    const blob = new Blob([encodedData], {type: 'application/json'});

    // Create a blob URL
    const url = URL.createObjectURL(blob);

    // Create a download link
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;

    // Simulate a click on the link
    link.click();

    // Free the blob URL
    URL.revokeObjectURL(url);
});

inputFileLoad.addEventListener('change', () => {
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = (event) => {
            const encodedData = event.target.result;
            const stringData = atob(decodeURI(encodedData));
            const objectData = JSON.parse(stringData);
            gui.load(objectData.gui);
            animator.load(objectData.animation);
            loopLengthSelect.value = objectData.length;
            player.seconds = objectData.length;
            update();
            modal.style.display = 'none';
        };

        reader.readAsText(file);
    }
});

btnFileLoad.addEventListener('click', () => {
    // Trigger the file input dialog
    fileInput.click();
});

btnClose.addEventListener('click', () => {
    modal.style.display = 'none';
});
};