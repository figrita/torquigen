export default class Animator {
  constructor(guiItems, container, controls) {
    this.guiItems = guiItems;
    this.container = container;
    this.initControls = controls;
    this.elements = {};
    this.createAnimationGui();
  }

  createAnimationGui() {
    this.guiItems
      .filter((item) => item.type === 'float')
      .forEach((guiItem) => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.flexDirection = 'row';
        div.style.gap = '10px';
        div.innerHTML = `
<span><label>Enable:&nbsp;<input type="checkbox" class="enabled" /></label></span>
<span>
${guiItem.label}
</span>
<span>Start Value:
<input type="number" class="start-value" min="${guiItem.min}" max="${guiItem.max}" step="${guiItem.step}" value="${this.initControls[guiItem.key]}" />
</span>
<span> Transition:
<select class="first-tween">
<option value="constant">constant</option>
<option value="linear">linear</option>
<option value="easeIn">ease in</option>
<option value="easeOut">ease out</option>
<option value="easeInOut" selected>ease in out</option>
</select>
</span>
<span> Inflection Point:
<input type="range" class="inflection-point" min="0" max="1" step="0.01" />
</span>
<span> Inflection Value:
<input type="number" class="inflection-value" min="${guiItem.min}" max="${guiItem.max}" step="${guiItem.step}" value="${this.initControls[guiItem.key]}" />
</span>
<span> Transition:
<select class="second-tween">
<option value="constant">constant</option>
<option value="linear">linear</option>
<option value="easeIn">ease in</option>
<option value="easeOut">ease out</option>
<option value="easeInOut" selected>ease in out</option>
</select>
</span>
<span> End Value:
<input type="number" class="end-value" min="${guiItem.min}" max="${guiItem.max}" step="${guiItem.step}" value="${this.initControls[guiItem.key]}" />
</span>
<span> Repeat:
<input type="number" class="n-t" min="1" max="100" value="1" />
</span>
        `;
        this.container.appendChild(div);

        this.elements[guiItem.key] = {
          enabled: div.querySelector('.enabled'),
          startValue: div.querySelector('.start-value'),
          firstTween: div.querySelector('.first-tween'),
          inflectionPoint: div.querySelector('.inflection-point'),
          inflectionValue: div.querySelector('.inflection-value'),
          secondTween: div.querySelector('.second-tween'),
          endValue: div.querySelector('.end-value'),
          nT: div.querySelector('.n-t'),
        };
      });
  }

  getAnimatedValues(t, inputObject) {
    const outputObject = { ...inputObject };

    Object.keys(this.elements).forEach((key) => {
      const element = this.elements[key];
      if (element.enabled.checked) {
        const startValue = parseFloat(element.startValue.value);
        const inflectionPoint = parseFloat(element.inflectionPoint.value);
        const inflectionValue = parseFloat(element.inflectionValue.value);
        const endValue = parseFloat(element.endValue.value);
        const nT = parseInt(element.nT.value, 10);

        // Calculate the normalized time 't' and scale it by nT
        let adjustedT = (t * nT) % 1; // % 1 Ensure animation repeats

        const firstTweenFunction = getTweenFunction(element.firstTween.value);
        const secondTweenFunction = getTweenFunction(element.secondTween.value);

        let value;

        if (adjustedT <= inflectionPoint) {
          adjustedT /= inflectionPoint;
          value = firstTweenFunction(startValue, inflectionValue, adjustedT);
        } else {
          adjustedT = (adjustedT - inflectionPoint) / (1 - inflectionPoint);
          value = secondTweenFunction(inflectionValue, endValue, adjustedT);
        }

        outputObject[key] = value;
      }
    });

    return outputObject;
  }

  save() {
    const savedData = {};

    Object.keys(this.elements).forEach((key) => {
      const element = this.elements[key];
      if (element.enabled.checked) {
        savedData[key] = [
          parseFloat(element.startValue.value),
          element.firstTween.value,
          parseFloat(element.inflectionPoint.value),
          parseFloat(element.inflectionValue.value),
          element.secondTween.value,
          parseFloat(element.endValue.value),
          parseInt(element.nT.value, 10),
        ].join(',');
      }
    });

    return savedData;
  }

  load(data) {
    // Reset all elements to disabled before loading
    Object.keys(this.elements).forEach((key) => {
      this.elements[key].enabled.checked = false;
    });

    Object.keys(data).forEach((key) => {
      const element = this.elements[key];
      const itemData = data[key].split(',').map((value, index) => (index === 1 || index === 4 ? value : parseFloat(value)));

      element.enabled.checked = true;
      [
        element.startValue.value,
        element.firstTween.value,
        element.inflectionPoint.value,
        element.inflectionValue.value,
        element.secondTween.value,
        element.endValue.value,
        element.nT.value,
      ] = itemData;
    });
  }
}

function getTweenFunction(type) {
  switch (type) {
    case 'constant':
      return (start) => start;
    case 'linear':
      return (start, end, t) => start + (end - start) * t;
    case 'easeIn':
      return (start, end, t) => start + (end - start) * t * t;
    case 'easeOut':
      return (start, end, t) => start + (end - start) * (1 - (1 - t) * (1 - t));
    case 'easeInOut':
      return (start, end, t) => {
        if (t < 0.5) {
          return start + (end - start) * 2 * t * t;
        }
        return start + (end - start) * (1 - 2 * (1 - t) * (1 - t));
      };
    default:
      return (start) => start;
  }
}
