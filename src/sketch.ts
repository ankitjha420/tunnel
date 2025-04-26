// imports ->
import * as THREE from 'three'
import { OrbitControls, ParametricGeometry } from 'three/examples/jsm/Addons.js'
import { WebGPURenderer, MeshPhysicalNodeMaterial } from 'three/webgpu'
import { abs, floor, Fn, fract, sin, texture, uniform, uv } from 'three/tsl'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import scaling from '/nge.png'

// constants ->
const device = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: window.devicePixelRatio
}

export class Sketch {
    canvas: HTMLCanvasElement
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: WebGPURenderer | THREE.WebGLRenderer
    clock: THREE.Clock
    isInitialized: boolean = false
    controls: OrbitControls
    playhead: any
    time: number
    stats?: Stats
    memPanel: any
    isAnimating: boolean = true

    constructor(canvas: HTMLCanvasElement) {
        this.time = 0

        this.canvas = canvas
        this.scene = new THREE.Scene()

        this.camera = new THREE.PerspectiveCamera(
            35,
            device.width / device.height,
            0.01,
            100
        )
        this.camera.position.set(0, -1, 20)
        this.scene.add(this.camera)

        this.renderer = new THREE.WebGLRenderer({ canvas })
        this.renderer.setSize(device.width, device.height)
        this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2))
        this.renderer.setClearColor(0xeeeeee, 1)

        this.controls = new OrbitControls(this.camera, canvas)
        this.clock = new THREE.Clock()

        this.initStats()
        this.init()
    }

    addLights(): void {
        const pointLight = new THREE.PointLight(0xffffff, 100)
        pointLight.position.set(10, 10, 10)
        this.scene.add(new THREE.AmbientLight(new THREE.Color(1, 1, 1), 10))
        this.scene.add(pointLight)
    }

    async init(): Promise<void> {
        try {
            await this.initWebGPU()
            this.addLights()
            this.getGeometry()
            // this.addCubeMesh()
            this.resize()

            this.isInitialized = true
            this.render()
        } catch (e) {
            console.error('webgpu init failed', e)
        }
    }

    async initWebGPU(): Promise<void> {
        try {
            const gpuRenderer = new WebGPURenderer({
                canvas: this.canvas,
                antialias: true
            })
            await gpuRenderer.init()

            gpuRenderer.setSize(device.width, device.height)
            gpuRenderer.setClearColor(0xeeeeee, 1)
            gpuRenderer.setPixelRatio(Math.min(device.pixelRatio, 2))

            this.renderer = gpuRenderer
            console.log('web gpu renderer initialized')
        } catch (e) {
            console.error('web gpu initialization failed', e)
            console.log('falling back to webgl renderer')
        }
    }

    render(): void {
        if (!this.isInitialized) {
            return
        }

        this.stats?.begin()
        this.time += 0.0005
        this.controls.update()
        if (this.playhead) {
            this.playhead.value = this.time
        }

        this.renderer.render(this.scene, this.camera)

        this.stats?.end()
        requestAnimationFrame(this.render.bind(this))
    }

    resize(): void {
        window.addEventListener('resize', this.onResize.bind(this))
    }

    onResize(): void {
        device.width = window.innerWidth
        device.height = window.innerHeight

        this.camera.aspect = device.width / device.height
        this.camera.updateProjectionMatrix()

        this.renderer.setSize(device.width, device.height)
    }

    getGeometry(): void {
        const bezier = (
            a: number,
            b: number,
            c: number,
            d: number,
            t: number): number => {
            const u = 1 - t
            return (
                (u * u * u * a) +
                (3 * u * u * t * b) +
                (3 * u * t * t * c) +
                (t * t * t * d)
            )
        }

        const getRadius = (t: number) => {
            return bezier(70, 1, 1, 1, t)
        }

        const geometry = new ParametricGeometry((u, v, target) => {
            let radius = getRadius(v)

            let x = Math.sin(u * Math.PI * 2) * radius
            let y = Math.cos(u * Math.PI * 2) * radius
            let z = (v - 0.5) * 15

            target.set(x, y, z)
        }, 325, 325)

        const material = new MeshPhysicalNodeMaterial({
            side: THREE.DoubleSide,
            roughness: 0.5,
            color: 0x000099,
            metalness: 0.5
        })

        //  TODO: -> make tsl shader and image texture ->
        let playhead = uniform(0.0)
        this.playhead = playhead

        let map = new THREE.TextureLoader().load(scaling)
        map.wrapS = THREE.RepeatWrapping
        map.wrapT = THREE.RepeatWrapping

        const calculated = Fn(() => {
            let row = floor(fract(uv().y.add(playhead)).mul(20))
            let randomValue = abs(fract(sin(row.mul(125)).mul(456789.123)))

            let newUv = uv().toVar()
            newUv.mulAssign(1)
            newUv.x.mulAssign(7).addAssign(playhead.mul(randomValue))
            newUv.y.mulAssign(10)
            newUv.y.addAssign(playhead).mul(-1.0)

            return texture(map, newUv).r.oneMinus()
        })

        material.colorNode = calculated()
        material.roughnessNode = calculated()


        const mesh = new THREE.Mesh(geometry, material)
        mesh.rotation.x = -2
        this.scene.add(mesh)
    }

    initStats(): void {
        this.stats = new Stats()
        this.stats.showPanel(0)
        this.stats.addPanel(new Stats.Panel('MB', '#f8f', '#212'))
        // this.memPanel = this.stats.panels[2]
        this.stats.dom.style.cssText = 'position:absolute;top:0;left:0;'
        document.body.appendChild(this.stats.dom)
    }

    addCubeMesh(): void {
        const geometry = new THREE.BoxGeometry(1, 1, 1);

        const material = new THREE.MeshStandardMaterial({
            color: 0x3498db,
            roughness: 0.5,
            metalness: 0.2
        });

        const cubeMesh = new THREE.Mesh(geometry, material);
        cubeMesh.position.set(0, 0, 0);
        cubeMesh.rotation.set(0.5, 0.5, 0);
        this.scene.add(cubeMesh);
        console.log('Basic cube mesh added to scene');
    }
}
