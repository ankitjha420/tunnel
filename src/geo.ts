import * as THREE from 'three'
import { ParametricGeometry } from 'three/examples/jsm/Addons.js'
import { floor, Fn, fract, uniform, uv, vec4 } from 'three/tsl'
import { MeshPhysicalNodeMaterial } from 'three/webgpu'

export class Geo {
    public playhead: any

    getGeometry(): THREE.Mesh {
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

        //  TODO: -> make webgpu shaders ->
        this.playhead = uniform(0.0)

        material.colorNode = Fn(() => {
            let row = floor(fract(uv().y.add(this.playhead)).mul(20))

            return vec4(
                row.div(10),
                0.0,
                0.0,
                1.0
            )
        })()

        const mesh = new THREE.Mesh(geometry, material)
        mesh.rotation.x = -1
        return mesh
    }
}
