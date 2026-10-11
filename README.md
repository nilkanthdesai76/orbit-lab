# 🛰️ OrbitLab: 3D Real-Time Earth & Satellite Telemetry

> Photorealistic 3D Earth globe visualization built with Three.js, live International Space Station (ISS) NORAD 25544 tracking, custom atmospheric Rayleigh scattering shaders, and satellite constellation orbital overlays.

---

## ⚡ Features

### 1. 🌍 Photorealistic 3D Earth Globe
- **Multi-Layer Surface**: High-resolution Earth day map with normal bump mapping and ocean specular reflectivity.
- **Atmospheric Rim Glow**: Custom GLSL vertex and fragment shader modeling Rayleigh scattering rim lighting along Earth's curvature.
- **Dynamic Cloud Deck**: Revolving cloud sphere with realistic altitude, alpha blending, and independent axial rotation.
- **Deep Starfield**: 1,800 procedurally positioned background stars.

### 2. 🛰️ Real-Time ISS NORAD 25544 Tracking
- **Live Telemetry Stream**: Connects to the Open Notify API to fetch real-time latitude, longitude, altitude ($418\text{ km}$), and orbital velocity ($27,580\text{ km/h}$).
- **Procedural 3D ISS Model**: Detailed space station model featuring the pressurized central habitat module and golden solar array wings.
- **3D Orbital Trajectory Ribbon**: Continuous Catmull-Rom spline visualizing the $51.64^\circ$ inclined orbit path.
- **Lock-to-ISS Camera**: Smooth lerped camera tracking locking focus onto the station as it traverses Earth.

### 3. 📡 Satellite Constellation Overlays
- **GPS MEO Constellation**: 24 navigational satellites distributed across 6 inclined Medium Earth Orbit planes at $20,200\text{ km}$ altitude.
- **Starlink LEO Swarm**: 48 low Earth orbit satellites in orbital shells.
- **Hubble Space Telescope (HST)**: High-altitude astronomical observatory marker.

---

## 🚀 Quick Start

### Double-Click Launcher
Double-click `OrbitLab.command` in Finder to launch.

### Terminal
```bash
./launch.sh
```
Or open `index.html` in Safari or Chrome.
