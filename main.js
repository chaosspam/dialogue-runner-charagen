(function () {

  /* Module variables */
  // Screen drawing data
  let drawing = false;

  // Portrait drawing data
  const PORTRAIT_URL = "https://dlportraits.space/";
  let portraitImage = new Image();
  let portraitCanvas;
  const currentPortraitData = {};
  let basePath = "";
  let curCharId = "";

  // Emotion data
  const emotions = []

  /* Setup */

  window.addEventListener("load", init);

  /**
   * Initialize canvas and localization data
   */
  async function init() {
    try {
      // Fetch background and portrait data
      setupPortrait();
      await populatePortraitData();
    } catch(e) {
      console.error(e);
    }

    setupListener();
  }

  /**
   * Set up event listeners
   */
  function setupListener() {
    // Draw image after parameter change
    id("download").addEventListener("click", downloadImage);
    id("addEmotion").addEventListener("click", addEmotion);
    id("removeEmotion").addEventListener("click", removeEmotion);
    portraitImage.addEventListener("load", drawDialogueScreen);
  }

  /**
   * Setup portrait canvas and data
   */
  function setupPortrait() {
    portraitCanvas = document.createElement("canvas");
    portraitCanvas.width = 1024;
    portraitCanvas.height = 1024;
    resetPortraitData();
  }

  /**
   * Clears portrait data
   */
  function resetPortraitData() {
    currentPortraitData.base = "";
    currentPortraitData.offset = {"x": 0, "y": 0};
    currentPortraitData.face = "";
    currentPortraitData.mouth = "";
  }

  /**
   * Draws the dialogue screen based on inputs
   */
  async function drawDialogueScreen() {
    if(drawing) return;
    drawing = true;

    // Get canvas context
    const canvas = id("preview");
    const ctx = canvas.getContext("2d");

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Layers
    drawImageWithData(ctx, portraitImage);

    drawing = false;
  }

  /**
   * Draws the image with given data
   * @param {CanvasRenderingContext2D} ctx - Context of the canvas to draw on
   * @param {Object} layer - Data of the image
   */
  function drawImageWithData(ctx, image) {
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;

    let x = centerX - width / 2;
    let y = centerY - height / 2;

    ctx.drawImage(image, x, y, width, height);
  }

  /**
   * Generate a download link and click it
   */
  async function downloadImage() {

    const characterName = id("portraitCharacter").value.replace(/[\(\)]/g, "").toLowerCase().split(" ").join("_");
    const rpy = generateRenpyScript();

    this.innerText = "Generating";

    let downloadLink = document.createElement('a');
    downloadLink.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(rpy);
    downloadLink.download = characterName + '.rpy';
    downloadLink.click();

    this.innerText = "Download";
  }

  /**
   * Resets the portrait and background panel
   */
  function resetPanels() {
    id("portraitPanel").classList.add("hidden");
    id("portraitCharacter").value = "";
    id("facialExpression").innerHTML = "";
    id("mouthExpression").innerHTML = "";
    qsa(".tab .portrait-button").forEach(e => e.classList.remove("selected"));
    qsa(".tab .bg-button").forEach(e => e.classList.remove("selected"));
    resetPortraitData();
  }

  /* Portrait Panel */

  /**
   * Generate a button that toggles the portrait panel
   * @returns {HTMLButtonElement} button that toggles the portrait panel
   */
  function portraitPanelToggleButton() {
    let button = document.createElement("button");
    button.innerText = i18n[pageLang].loc.fromPortrait;
    button.addEventListener("click", togglePortraitPanel);
    button.classList.add("button");
    button.classList.add("portrait-button");
    return button;
  }

  /**
   * Toggles the portrait panel
   */
  function togglePortraitPanel() {
    // Toggle portrait panel
    let portraitHidden = id("portraitPanel").classList.toggle("hidden");
    this.classList.toggle("selected", !portraitHidden);

    // If panel is shown, update bg panel
    if(!portraitHidden) {
      id("backgroundPanel").classList.add("hidden");
      qs(".tab.active .bg-button").classList.remove("selected");
    }
  }

  /**
   * Fetches data for the available portraits
   */
  async function populatePortraitData() {
    let portraitData = await fetchJson(PORTRAIT_URL + "portrait_output/localizedDirData.json");
    let datalist = id("portraitList");
    for(file in portraitData.fileList) {
      let option = document.createElement("option");
      option.value = portraitData.fileList[file].en_us;
      option.dataset.id = file;
      datalist.appendChild(option);
    }

    id("portraitCharacter").addEventListener("change", validateDatalistInput);
  }

  /**
   * Validates the portrait input to match options in datalist
   */
  function validateDatalistInput() {
    let option = document.querySelector(`#portraitList option[value="${this.value}"]`);
    if (option === null) {
      this.value = "";
    } else {
      curCharId = option.dataset.id;
      loadSelectedPortraitData(option.dataset.id);
    }
  }

  /**
   * Gets data about the portrait of the character with the given id
   * @param {string} charId - id of the character
   */
  async function loadSelectedPortraitData(charId) {
    let data = await fetchJson(PORTRAIT_URL + `portrait_output/${charId}/data.json`);

    let faceContainer = id("facialExpression");
    faceContainer.innerHTML = "";
    for(let i = 0; i < data.partsData.faceParts.length; i++) {
      let facePartUrl = PORTRAIT_URL + data.partsData.faceParts[i].substring(2);
      let facePart = document.createElement("img");
      facePart.src = facePartUrl;
      facePart.addEventListener("click", function() {
        currentPortraitData.face = this.src;
        drawPortraitAndRender();
      });
      faceContainer.appendChild(facePart);
    }

    let mouthContainer = id("mouthExpression");
    mouthContainer.innerHTML = "";
    for(let i = 0; i < data.partsData.mouthParts.length; i++) {
      let mouthPartUrl = PORTRAIT_URL + data.partsData.mouthParts[i].substring(2);
      let mouthPart = document.createElement("img");
      mouthPart.src = mouthPartUrl;
      mouthPart.addEventListener("click", function() {
        currentPortraitData.mouth = this.src;
        drawPortraitAndRender();
      });
      mouthContainer.appendChild(mouthPart);
    }

    currentPortraitData.face = "";
    currentPortraitData.mouth = "";
    currentPortraitData.base = PORTRAIT_URL + `portrait_output/${charId}/${charId}_base.png`;
    currentPortraitData.offset = data.offset;

    drawPortraitAndRender();
  }

  /**
   * Draws the portrait on the portrait canvas and sets the image source of the
   * current tab to the portrait canvas
   */
  async function drawPortraitAndRender() {
    console.log(currentPortraitData);
    basePath = currentPortraitData.base.replace(PORTRAIT_URL, "");
    const ctx = portraitCanvas.getContext("2d");
    ctx.clearRect(0, 0, portraitCanvas.width, portraitCanvas.height);

    const baseImage = await loadImage(currentPortraitData.base);
    ctx.drawImage(baseImage, 0, 0);

    if(currentPortraitData.face !== "") {
      const faceImage = await loadImage(currentPortraitData.face);
      ctx.drawImage(faceImage, currentPortraitData.offset.x, currentPortraitData.offset.y);
    }

    if(currentPortraitData.mouth !== "") {
      const mouthImage = await loadImage(currentPortraitData.mouth);
      ctx.drawImage(mouthImage, currentPortraitData.offset.x, currentPortraitData.offset.y);
    }

    const blob = await new Promise(resolve => portraitCanvas.toBlob(resolve));
    const url = URL.createObjectURL(blob);
    portraitImage.src = url;
  }

  function generateRenpyScript() {

    const characterName = id("portraitCharacter").value.replace(/[\(\)]/g, "").toLowerCase().split(" ").join("_");

    let result = `# Character: ${id("portraitCharacter").value}
# Remember to include portrait_data/${curCharId} from https://github.com/sh0wer1ee/DLPortraits in the portrait_data folder in the Ren'Py project
`;

    for(let i = 0 ; i < emotions.length; i++) {
      const e = emotions[i];
      const emotionName = e.name;
      const blink = e.frames[1].face !== e.frames[0].face && e.frames[1].face !== "";
      const lipflap = e.frames[1].mouth !== e.frames[0].mouth && e.frames[1].mouth !== "";
      const offsetTuple = `(${currentPortraitData.offset.x}, ${currentPortraitData.offset.y})`;

      result += `image ${characterName} ${emotionName} = Composite(
  (1024, 1024),
  (0, 0), "${basePath}",
  ${offsetTuple}, "${blink ? `${characterName} eyes ${emotionName}` : e.frames[0].face}",
  ${offsetTuple}, ${lipflap ? `WhileSpeaking("${characterName}", "${characterName} mouth ${emotionName}", "${e.frames[0].mouth}"` : `"${e.frames[0].mouth}"`})
)

${blink ? `image ${characterName} eyes ${emotionName}:
"${e.frames[0].face}"
choice:
    4.5
choice:
    3.5
choice:
    1.5
"${e.frames[1].face}"
.25
repeat` : ""}

${lipflap ? `image ${characterName} mouth ${emotionName}:
"${e.frames[1].mouth}"
.2
"${e.frames[0].mouth}"
.2
repeat` : ""}

`
    }

    return result;
  }

  /* Helper functions */

  /**
   * Shorthand for document.getElementById
   * @param {string} elementId - id of the element to get
   * @returns {Element} - element with the id
   */
  function id(elementId) {
    return document.getElementById(elementId);
  }

  /**
   * Shorthand for document.querySelector
   * @param {string} selector - selector of the element to get
   * @returns {Element} - first element matching the selector
   */
  function qs(selector) {
    return document.querySelector(selector);
  }

  /**
   * Shorthand for document.querySelectorAll
   * @param {string} selector - selector of the elements to get
   * @returns {NodeList} - element that matches at least one of the specified selectors
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * Returns the JSON object from the response of a request to the URL
   * @param {string} url - url to fetch from
   * @returns {Object} JSON object fron response
   */
  async function fetchJson(url) {
    try {
      let response = await fetch(url);
      if(response.ok) {
        let json = await response.json();
        return json;
      } else {
        throw new error(await response.text());
      }
    } catch (e) {
      console.error(e);
    }
  }

  function addEmotion() {

    const newEmotion = {
      name: "undefined_" + emotions.length,
      frames: [
        {
          face: "",
          mouth: ""
        },
        {
          face: "",
          mouth: ""
        }
      ]
    }

    const node = document.createElement("div");

    const nameL = document.createElement("label");
    nameL.innerText = "Emotion Name";
    const hr1 = document.createElement("hr");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.autocomplete = "off";
    nameInput.placeholder = "Emotion Name";
    nameInput.addEventListener("input", e => {
      newEmotion.name = e.currentTarget.value;
      console.log(newEmotion, emotions);
    })
    const br = document.createElement("br");

    const frameL = document.createElement("label");
    frameL.innerText = "Frames";

    const hr2 = document.createElement("hr");

    const frameCont = document.createElement("div");
    frameCont.classList.add("frame-container");

    const frametxt = ["Eye Open, Mouth Closed", "Eye Closed, Mouth Open"];

    for(let i = 0; i < 2; i++) {
      const card = document.createElement("div");
      const lbl = document.createElement("label");
      lbl.innerText = frametxt[i];
      const img = document.createElement("img");
      img.src = "/images/add.png";
      img.addEventListener("click", e => {
        newEmotion.frames[i].face = currentPortraitData.face.replace(PORTRAIT_URL, "");
        newEmotion.frames[i].mouth = currentPortraitData.mouth.replace(PORTRAIT_URL, "");
        grabCurrent(e.currentTarget);
      });

      card.appendChild(lbl);
      card.appendChild(img);
      frameCont.appendChild(card);
    }


    node.appendChild(nameL);
    node.appendChild(hr1);
    node.appendChild(nameInput);
    node.appendChild(br);
    node.appendChild(frameL);
    node.appendChild(hr2);
    node.appendChild(frameCont);

    newEmotion.node = node;

    emotions.push(newEmotion);
    id("backgroundPanel").appendChild(node);
  }

  async function grabCurrent(image) {
    const blob = await new Promise(resolve => id("preview").toBlob(resolve));
    const url = URL.createObjectURL(blob);
    image.src = url;
  }

  function removeEmotion() {
    const popped = emotions.pop();
    if(popped.node) {
      popped.node.remove();
    }
  }

  /**
   * Creates and returns the image element with given souce
   * @param {string} src - source of the image
   * @returns {Promise} - resolves to the image element if the image loads successfully
   */
  function loadImage(src){
    let img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    return new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  }

})();
