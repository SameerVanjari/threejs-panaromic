import * as THREE from "three";
import { hotspotPositions, products } from "./product-hotspots";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let isUserInteracting = false,
  onPointerDownMouseX = 0,
  onPointerDownMouseY = 0,
  lon = 0,
  onPointerDownLon = 0,
  lat = 0,
  onPointerDownLat = 0,
  phi = 0,
  theta = 0;

const container = document.getElementById("container");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  1,
  1100
);
const renderer = new THREE.WebGLRenderer({ antialias: true });

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clickingObjects = [];

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// create a panaromic sphere
const geometry = new THREE.SphereGeometry(500, 60, 40);
geometry.scale(-1, 1, 1);

// create a panaromic image texture
const loader = new THREE.TextureLoader();
const texture = loader.load("/room.jpg");
texture.colorSpace = THREE.SRGBColorSpace;

texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

const material = new THREE.MeshBasicMaterial({ map: texture });
const sphere = new THREE.Mesh(geometry, material);

scene.add(sphere);

container.style.touchAction = "none";
container.addEventListener("pointerdown", onPointerDown);

const gltfLoader = new GLTFLoader();

function loadHotspots() {
  hotspotPositions.forEach((hotspot) => {
    gltfLoader.load(
      hotspot.model,
      function (gltf) {
        const model = gltf.scene;

        // Set the position of the model
        model.position.set(hotspot.x, hotspot.y, hotspot.z);
        model.scale.set(10, 10, 10); // Adjust scale as needed
        model.name = `Product-${hotspot.productId}`; // Set a name for the model
        model.userData = {
          productId: hotspot.productId,
          model: hotspot.model, // Store product ID in userData for easy access later
        };

        model.traverse(function (child) {
          if (child.isMesh) {
            child.castShadow = true; // Enable shadow casting
            child.receiveShadow = true; // Enable shadow receiving
          }
        });

        // Add the model to the scene
        scene.add(model);

        // Add the model to clickingObjects for raycasting
        clickingObjects.push(model);
      },
      undefined,
      function (error) {
        console.error("An error happened while loading the model:", error);
      }
    );
  });
}

// // add 3d object
// const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
// const boxMaterial = new THREE.MeshStandardMaterial({color: 0xff0000});
// const box = new THREE.Mesh(boxGeometry, boxMaterial);

// box.position.set(100, -40, -200);

// // Add ambient light (soft general light)
// const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
// scene.add(ambientLight);

// // Add directional light (like a sun lamp)
// const dirLight = new THREE.DirectionalLight(0xffffff, 1);
// dirLight.position.set(200, 100, 100);
// dirLight.castShadow = true;
// scene.add(dirLight);

// box.castShadow = true;
// box.receiveShadow = true;

// scene.add(box);
// clickingObjects.push(box);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(200, 100, 100);
dirLight.castShadow = true;
scene.add(dirLight);

let hoveredObject = null;
let originalMaterials = new Map();

container.addEventListener("pointermove", onPointerHover);

document.addEventListener("wheel", onDocumentMouseWheel);

window.addEventListener("resize", onWindowResize);

window.addEventListener("click", onClick);

// camera.position.set(0,0,0);

function onPointerDown(event) {
  if (event.isPrimary === false) return;

  isUserInteracting = true;

  onPointerDownMouseX = event.clientX;
  onPointerDownMouseY = event.clientY;

  onPointerDownLon = lon;
  onPointerDownLat = lat;

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
}

function onPointerMove(event) {
  if (event.isPrimary === false) return;

  lon = (onPointerDownMouseX - event.clientX) * 0.1 + onPointerDownLon;
  lat = (event.clientY - onPointerDownMouseY) * 0.1 + onPointerDownLat;
}

function onPointerHover(event) {
  // Convert mouse position to normalized device coordinates
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickingObjects, true);

  if (intersects.length > 0) {
    let object = intersects[0].object;
    // Find the root object in clickingObjects
    while (object.parent && !clickingObjects.includes(object)) {
      object = object.parent;
    }
    if (hoveredObject !== object) {
      // Restore previous hovered object's materials
      if (hoveredObject && originalMaterials.has(hoveredObject)) {
        hoveredObject.traverse((child) => {
          if (
            child.isMesh &&
            originalMaterials.get(hoveredObject)[child.uuid]
          ) {
            child.material = originalMaterials.get(hoveredObject)[child.uuid];
          }
        });
        originalMaterials.delete(hoveredObject);
      }
      // Store original materials and apply highlight
      hoveredObject = object;
      const mats = {};
      hoveredObject.traverse((child) => {
        if (child.isMesh) {
          mats[child.uuid] = child.material;
          const highlightMat = child.material.clone();
          highlightMat.emissive = new THREE.Color(0xffff00); // yellow highlight
          highlightMat.emissiveIntensity = 0.7;
          child.material = highlightMat;
        }
      });
      originalMaterials.set(hoveredObject, mats);
    }
  } else {
    // Restore previous hovered object's materials if nothing is hovered
    if (hoveredObject && originalMaterials.has(hoveredObject)) {
      hoveredObject.traverse((child) => {
        if (child.isMesh && originalMaterials.get(hoveredObject)[child.uuid]) {
          child.material = originalMaterials.get(hoveredObject)[child.uuid];
        }
      });
      originalMaterials.delete(hoveredObject);
      hoveredObject = null;
    }
  }
}

function onPointerUp(event) {
  if (event.isPrimary === false) return;

  isUserInteracting = false;

  document.removeEventListener("pointermove", onPointerMove);
  document.removeEventListener("pointerup", onPointerUp);
}

function onDocumentMouseWheel(event) {
  const fov = camera.fov + event.deltaY * 0.05;

  camera.fov = THREE.MathUtils.clamp(fov, 10, 75);

  camera.updateProjectionMatrix();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  // Clamp latitude to prevent flipping
  lat = Math.max(-85, Math.min(85, lat));
  phi = THREE.MathUtils.degToRad(90 - lat);
  theta = THREE.MathUtils.degToRad(lon);

  // Calculate camera target
  const x = 500 * Math.sin(phi) * Math.cos(theta);
  const y = 500 * Math.cos(phi);
  const z = 500 * Math.sin(phi) * Math.sin(theta);

  camera.lookAt(x, y, z);

  renderer.render(scene, camera);
}

function onClick(event) {
  // convert mouse position to normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickingObjects, true);

  if (intersects.length > 0) {
    const clickedObject = intersects[1].object;

    let root = clickedObject;
    while (root.parent && !clickingObjects.includes(root)) {
      root = root.parent;
    }

    showPopup(root);
  }
}

function showPopup(object) {
  const popup = document.getElementById("popup");
  const title = document.querySelector(".product-title");
  const description = document.querySelector(".product-description");
  const price = document.querySelector(".product-price");
  const image = document.querySelector(".product-image");

  popup.style.display = "block";

  let product = products.find(
    (product) => product.id === object.userData.productId
  );
  if (!product)
    product = {
      name: "Unknown Product",
      price: "N/A",
      description: "No description available",
    };

  title.textContent = product.name;
  description.innerHTML = product.description;
  price.innerHTML = `Price: $${product.price}`;

  // product image details

  const imageDiv = document.querySelector(".product-image");
  imageDiv.innerHTML = ""; // Clear previous content

  // Create a Three.js renderer for the image div
  const imgWidth = imageDiv.clientWidth;
  const imgHeight = imageDiv.clientHeight;

  const imgRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  imgRenderer.setSize(imgWidth, imgHeight);
  imgRenderer.setClearColor(0x000000, 0); // transparent background
  imageDiv.appendChild(imgRenderer.domElement);

  // Create a new scene and camera for the product image
  const imgScene = new THREE.Scene();
  const imgCamera = new THREE.PerspectiveCamera(
    45,
    imgWidth / imgHeight,
    1,
    1000
  );
  switch (object.userData.productId) {
    case 1:
      imgCamera.position.z = 6;
      imgCamera.position.y = 3;
      // imgCamera.position.x = 0;
      break;
    case 2:
      imgCamera.position.z = 6;
      imgCamera.position.y = 3;
      break;
    case 3:
      imgCamera.position.z = 1;
      break;

    default:
      imgCamera.position.z = 5;
  }

  // Add OrbitControls for the product preview
  import("three/examples/jsm/controls/OrbitControls").then(
    ({ OrbitControls }) => {
      const controls = new OrbitControls(imgCamera, imgRenderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.enablePan = false;
      controls.minDistance = 5;
      controls.maxDistance = 15;
      controls.target.set(0, 0, 0);
      controls.update();

      gltfLoader.load(object.userData.model, function (gltf) {
        const model = gltf.scene;

        model.scale.set(0.5, 0.5, 0.5);
        switch (object.userData.productId) {
          case 1:
            model.position.set(0, 1.25, 0);
            break;
          case 2:
            model.position.set(0, -0.7, 0);
            break;
          case 3:
            model.position.set(0, 0, 0);
            model.rotation.x = Math.PI / 9;
            break;

          default:
            model.position.set(0, 0, 0);
        }

        // Tilt the model away from the viewer (reverse tilt, e.g., -20 degrees)

        imgScene.add(model);

        // Animate with OrbitControls and auto-rotate initially
        let autoRotate = true;
        let autoRotateTimeout = setTimeout(() => {
          autoRotate = false;
        }, 2000); // Stop auto-rotation after 2 seconds

        function animatePreview() {
          if (autoRotate) {
            model.rotation.y += 0.02;
          }
          controls.update();
          imgRenderer.render(imgScene, imgCamera);
          requestAnimationFrame(animatePreview);
        }

        // If user interacts, stop auto-rotation
        controls.addEventListener("start", () => {
          autoRotate = false;
          clearTimeout(autoRotateTimeout);
        });

        animatePreview();
      });

      // Lighting for the image scene
      const imgLight = new THREE.AmbientLight(0xffffff, 1);
      imgScene.add(imgLight);
    }
  );
}

animate();
loadHotspots();
