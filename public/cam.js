const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const test = document.getElementById('test');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');
const stopButton = document.getElementById('stop');
const info = document.getElementById('affichage');  // comment or suppr if another model
const classThreshold = 0.5;
const camWidth = 640;
const camHeight = 480;
const yoloShape = [640, 640];
const labels = ['casque ok', 'casque pas ok', 'veste  pas ok', 'veste ok'];
let model = undefined;
let stopInference = false;
let children = [];


/**
 * load yolo model
 */
async function load() {
  model = await tf.loadGraphModel("yolo/model.json");
  demosSection.classList.remove('invisible');
}

/**
 * activate webcam
 */
function getUserMediaSupported() {
  return !!(navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia);
}

/**
 * start stream
 */
function enableCam(event) {
  if (!model) {
    return;
  }
  event.target.classList.add('removed');  
  video.style.display = "block";
  stopButton.style.display = "block";
  stopInference = false;
  const constraints = {
    video: true
  };
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    video.srcObject = stream;
    video.addEventListener('loadeddata', predictWebcam);
  });
}

/**
 * normalise les images
 * @param {*} source image issue du stream vidéo 
 * retourne un tenseur, les ratios de l'image
 */
function preprocess (source) {
  let xRatio, yRatio; // ratios for boxes

  const input = tf.tidy(() => {
    const img = tf.browser.fromPixels(source);
    const imgPadded = img.pad([
      [0, camWidth - camHeight], // padding y
      [0, 0],
      [0, 0],
    ]);

    xRatio = 1; 
    yRatio = camWidth / camHeight;

    return tf.image
      .resizeBilinear(imgPadded, yoloShape) // resize frame
      .div(255.0) // normalize
      .expandDims(0); // add batch
  });
  
  return [input, xRatio, yRatio];
};

/**
 * affiche les boxes et les résultats de la détection
 * @param {string} containeur l'élément qui contient la vidéo html 
 * @param {array} boxes_data yolo -> xywh
 * @param {array} scores_data yolo -> score entre 0 et 1
 * @param {array} classes_data yolo -> 4 classes
 * @param {array} ratios pour dénormaliser les boxes yolo 
 */
function renderBoxes(containeur, boxes_data, scores_data, classes_data, ratios) {
  let epi = 0; // comment or suppr if another model 
  for (let i = 0; i < children.length; i++) {
    liveView.removeChild(children[i]);
  }
  children.splice(0);

  for (let i = 0; i < scores_data.length; ++i) {
    if (scores_data[i] > classThreshold) {

      // comment or suppr if another model :
      if (classes_data[i] == 0 || classes_data[i] == 3) {
        epi++;
      } 
      //end comment

      //coordonnées
      let [x1, y1, x2, y2] = boxes_data.slice(i * 4, (i + 1) * 4);
      x1 *= 640 * ratios[0];
      x2 *= 640 * ratios[0];
      y1 *= 480 * 1.33;
      y2 *= 480 * 1.33;
      const width = x2 - x1;
      const height = y2 - y1;
  
      // score et classe
      const p = document.createElement('p');
      p.innerText = labels[classes_data[i]]  + ' - with ' 
        + Math.round(parseFloat(scores_data[i]) * 100) 
        + '% confidence.';
      p.style = 'margin-left: ' + x1 + 'px; margin-top: '
        + (y1 -10 ) + 'px; width: ' 
        + (width -10 ) + 'px; top: 0; left: 0;';

      // box
      const highlighter = document.createElement('div');
      highlighter.setAttribute('class', 'highlighter');
      highlighter.style = 'left: ' + x1 + 'px; top: '
      + y1 + 'px; width: ' 
      + width + 'px; height: '
      + height + 'px;';

      // DOM
      liveView.appendChild(highlighter);
      liveView.appendChild(p);
      children.push(highlighter);
      children.push(p);
    }
  }

  // comment or suppr if another model :
  if (epi != 2) {
    info.innerText = "mettez vos équipements de sécurité !";
    info.style.color = "red";
  } else {
    info.innerText = "équipements de sécurité ok";
    info.style.color = "blue";

  }
  // end comment
}

/**
 * normalisation image 
 * prédictions
 * boxes
 */
async function predictWebcam() {

  const [input, xRatio, yRatio] = preprocess(video);

  model.executeAsync(input).then((res) => {
    const [boxes, scores, classes] = res.slice(0, 3);
    const boxes_data = boxes.dataSync();
    const scores_data = scores.dataSync();
    const classes_data = classes.dataSync();
    renderBoxes(liveView, boxes_data, scores_data, classes_data, [xRatio, yRatio]);
    tf.dispose(res);
  });
  if (stopInference == false) {
    window.requestAnimationFrame(predictWebcam);
  } else {
    return;
  }
}

/**
 * callback pour stopper la vidéo et l'inférence
 */
function stopVideo() {
  video.srcObject.getTracks().forEach((track) => {
      if (track.readyState == 'live') {
          track.stop();
      }
  });
  enableWebcamButton.classList.remove('removed');
  video.style.display = "none";
  stopButton.style.display = "none";
  stopInference = true;
  info.innerText = "";
  for (let i = 0; i < children.length; i++) {
    liveView.removeChild(children[i]);
  }
  children.splice(0);
}


stopButton.style.display = "none";
stopButton.addEventListener('click', stopVideo);
load();

if (getUserMediaSupported()) {
  enableWebcamButton.addEventListener('click', enableCam);
} else {
  console.warn('getUserMedia() is not supported by your browser');
}






