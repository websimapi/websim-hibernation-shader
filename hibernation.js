import * as THREE from 'three';

class HibernationShader {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.info = document.getElementById('info');
        this.mouse = new THREE.Vector2(0.5, 0.5);
        this.time = 0;
        this.isAsleep = true;
        
        this.init();
        this.bindEvents();
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        
        this.resize();
        
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform float uTime;
            uniform vec2 uMouse;
            uniform vec2 uResolution;
            varying vec2 vUv;

            vec3 hsv2rgb(vec3 c) {
                vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
            }

            float noise(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }

            float smoothNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                
                float a = noise(i);
                float b = noise(i + vec2(1.0, 0.0));
                float c = noise(i + vec2(0.0, 1.0));
                float d = noise(i + vec2(1.0, 1.0));
                
                return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
            }

            float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 0.0;
                
                for (int i = 0; i < 5; i++) {
                    value += amplitude * smoothNoise(p);
                    p *= 2.0;
                    amplitude *= 0.5;
                }
                
                return value;
            }

            void main() {
                vec2 uv = vUv;
                vec2 centered = (uv - 0.5) * 2.0;
                float dist = length(centered);
                
                // Breathing effect
                float breath = sin(uTime * 0.2) * 0.1 + 0.9;
                
                // Flowing waves
                vec2 flow = vec2(
                    uTime * 0.05,
                    sin(uTime * 0.03) * 0.1
                );
                
                vec2 noiseCoord = uv * 3.0 + flow;
                float n = fbm(noiseCoord);
                
                // Mouse interaction
                vec2 mouseEffect = (uMouse - uv) * 0.5;
                float mouseDist = length(mouseEffect);
                float mouseInfluence = 1.0 - smoothstep(0.0, 0.5, mouseDist);
                
                // Color mixing
                float hueShift = uTime * 0.01 + n * 0.1;
                vec3 color1 = hsv2rgb(vec3(hueShift + 0.6, 0.6, 0.3));
                vec3 color2 = hsv2rgb(vec3(hueShift + 0.8, 0.4, 0.2));
                vec3 color3 = hsv2rgb(vec3(hueShift + 0.4, 0.3, 0.1));
                
                vec3 baseColor = mix(color1, color2, n);
                baseColor = mix(baseColor, color3, dist * 0.5);
                
                // Add mouse glow
                vec3 mouseGlow = vec3(0.3, 0.6, 1.0) * mouseInfluence * 0.3;
                baseColor += mouseGlow;
                
                // Soft edges
                float edge = smoothstep(0.8, 0.0, dist);
                baseColor *= edge * breath;
                
                // Subtle scanlines
                float scanline = sin(uv.y * 1000.0 + uTime) * 0.01;
                baseColor += scanline;
                
                gl_FragColor = vec4(baseColor, 1.0);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uMouse: { value: new THREE.Vector2(0.5, 0.5) },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
            },
            vertexShader,
            fragmentShader
        });

        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(mesh);
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        
        // Wake events
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('touchmove', (e) => this.handleTouch(e));
        document.addEventListener('keydown', () => this.wake());
        document.addEventListener('click', () => this.wake());
    }

    handleMouseMove(e) {
        this.mouse.x = e.clientX / window.innerWidth;
        this.mouse.y = 1.0 - (e.clientY / window.innerHeight);
        this.material.uniforms.uMouse.value = this.mouse;
        
        if (this.isAsleep) {
            this.wake();
        }
    }

    handleTouch(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.mouse.x = touch.clientX / window.innerWidth;
            this.mouse.y = 1.0 - (touch.clientY / window.innerHeight);
            this.material.uniforms.uMouse.value = this.mouse;
            this.wake();
        }
    }

    wake() {
        if (this.isAsleep) {
            this.isAsleep = false;
            this.info.classList.add('fade');
            
            setTimeout(() => {
                this.info.style.display = 'none';
            }, 300);
        }
    }

    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.renderer.setSize(width, height);
        this.material.uniforms.uResolution.value.set(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.time += 0.01;
        this.material.uniforms.uTime.value = this.time;
        
        this.renderer.render(this.scene, this.camera);
    }
}

new HibernationShader();

