import * as THREE from 'three'

let isUserInteracting = false,
				onPointerDownMouseX = 0, onPointerDownMouseY = 0,
				lon = 0, onPointerDownLon = 0,
				lat = 0, onPointerDownLat = 0,
				phi = 0, theta = 0;

const container = document.getElementById('container');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1100);
const renderer = new THREE.WebGLRenderer({antialias: true})

const raycaster = new THREE.Raycaster();
const mouse  = new THREE.Vector2();
const clickingObjects = [];

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop( animate );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// create a panaromic sphere
const geometry = new THREE.SphereGeometry(500, 60, 40);
geometry.scale(-1,1,1);

// create a panaromic image texture
const loader = new THREE.TextureLoader();
const texture = loader.load('/room.jpg');
texture.colorSpace = THREE.SRGBColorSpace;

texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

const material = new THREE.MeshBasicMaterial({map: texture});
const sphere = new THREE.Mesh(geometry, material);

scene.add(sphere);

container.style.touchAction = 'none';
container.addEventListener('pointerdown', onPointerDown);

// add 3d object
const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
const boxMaterial = new THREE.MeshStandardMaterial({color: 0xff0000});
const box = new THREE.Mesh(boxGeometry, boxMaterial);

box.position.set(100, -40, -200);

// Add ambient light (soft general light)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Add directional light (like a sun lamp)
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(200, 100, 100);
dirLight.castShadow = true;
scene.add(dirLight);

box.castShadow = true;
box.receiveShadow = true;

scene.add(box);
clickingObjects.push(box);





document.addEventListener('wheel', onDocumentMouseWheel);

window.addEventListener('resize', onWindowResize);

window.addEventListener('click', onClick);

// camera.position.set(0,0,0);

function onPointerDown(event){
    if(event.isPrimary === false ) return;

    isUserInteracting = true;

    onPointerDownMouseX = event.clientX;
    onPointerDownMouseY = event.clientY;

    onPointerDownLon = lon;
    onPointerDownLat = lat;

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(event){
    if(event.isPrimary === false ) return;

    lon = ( onPointerDownMouseX - event.clientX ) * 0.1 + onPointerDownLon;
    lat = ( event.clientY - onPointerDownMouseY) * 0.1 + onPointerDownLat;
}


function onPointerUp(event){
    if(event.isPrimary === false) return;

    isUserInteracting = false;

    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
}

function onDocumentMouseWheel(event){
    const fov = camera.fov + event.deltaY * 0.05;

    camera.fov = THREE.MathUtils.clamp(fov, 10, 75);

    camera.updateProjectionMatrix();
}

function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();
    
    renderer.setSize( window.innerWidth, window.innerHeight);
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

function onClick(event){
    // convert mouse position to normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    
    raycaster.setFromCamera(mouse,camera);
    const intersects = raycaster.intersectObjects(clickingObjects);
    
    if(intersects.length > 0 ){
        const clickedObject = intersects[0].object;
        box.scale.set(10, 10, 10);
        console.log("clicked");
        showPopup(clickedObject)
    }

}

function showPopup(object) {
    const popup = document.getElementById('popup');
    const content = document.getElementById('popup-content');

    console.log("object", object)

    popup.style.display = 'block';
    content.innerHTML = `
        <strong>3D Object Info</strong><br>
        Position: ${object.position.x.toFixed(1)}, ${object.position.y.toFixed(1)}, ${object.position.z.toFixed(1)}
    `;
}


animate();

