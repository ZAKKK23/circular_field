# plane-vtp-target-field (Voronoi Topological Perception)

The VTP agent model on the plane with a **large lattice of static targets**
(independent x and y spacing) and **one target that oscillates in x and y**,
with adjustable frequencies and **asymmetric strokes** (fast return), as a
MATLAB model and a dependency-free browser port of the same dynamics.

**[Live site →](#)** (enable GitHub Pages, see below)

## What it is

Agents follow the Voronoi Topological Perception (VTP) model:

- **Topological neighbors.** An agent's neighbors are its Delaunay-triangulation
  neighbors (the agents whose Voronoi cells touch its own).
- **Repulsion.** Away from the nearest neighbor, with magnitude
  *s* = transition(distance / L): 1 when touching, fading smoothly to exactly
  0 at distance L (`L = 1`).
- **Alignment.** With its Delaunay neighbors, weighted by **&nu;**. Neighbors
  whose heading already agrees with the agent's count for more.
- **Homing.** Toward the nearest target, with magnitude 1 &minus; *s*, so
  repulsion takes priority when an agent is crowded.
- **Speed governor.** Each agent moves at tanh(*l* / L) times its desired
  direction, where *l* is the distance to the boundary of its own Voronoi cell
  along its direction of motion. Crowded agents slow down; agents on the edge of
  the group have an unbounded cell and move at full speed.

### The target field

All targets are point targets, and each agent homes toward whichever one is
currently nearest to it.

- **Static targets** form a rectangular lattice covering `[-H, H]^2`, with a
  spacing in x and a spacing in y that you choose independently (defaults:
  `H = 50`, spacing 5 in both, i.e. 441 targets).
- **One oscillating target** oscillates in **both x and y** around a center:

  ```
  x(t) = cx + Ax * w( fx*t,                 nx )
  y(t) = cy + Ay * w( fy*t + phase/360,     ny )
  ```

  Each axis has its own amplitude `A`, frequency `f` (cycles per time step, so
  the period is 1 / f steps) and asymmetry ratio `n`; y can be phase-shifted
  relative to x. With equal frequencies and amplitudes, a 90 degree phase offset
  and `n = 1` the target travels on a circle; with different frequencies it
  traces a Lissajous curve. A frequency of 0 freezes that axis.
- **Asymmetric strokes.** The waveform `w` goes up and comes back down once per
  period. The ratio `n` sets how fast it comes back: the outgoing stroke takes
  the fraction `n/(n+1)` of the period and the return stroke `1/(n+1)`, so the
  return is **`n` times faster** than the way out. `n = 1` is a plain sine,
  `n = 3` returns three times faster, `n < 1` returns slower. Both strokes are
  half-cosines, so the motion is smooth at the turning points.

- **Field moving on a circle.** The whole field, meaning the static lattice and
  the oscillating target (with its oscillation center), moves rigidly so that
  its center travels on a circle centered on the origin. You choose the
  **radius** `R` of the circle and the **speed** along it (units per time step;
  negative = clockwise). At time `t` the field center is at
  `R * (cos(theta), sin(theta))` with `theta = (speed / R) * t`, so one lap takes
  `2*pi*R / speed` steps, and the oscillation happens around the moving center.
  `R = 0` keeps the field still. Agents move at up to 1 unit per step, so a speed
  below about 1 can be followed. In the web version, the **view** menu has
  *follow swarm*, *fixed (world)* (camera stays at the origin so you can watch
  the field circle around it) and *follow field*.

Because agents choose the *nearest* target, the oscillating target mostly pulls
in agents that are closer to it than to any lattice point. A larger lattice
spacing or the oscillation amplitudes gives it a larger catchment area.

## Structure

```
index.html              site shell — tabs for about / live simulation / matlab version
assets/style.css        site styling
assets/sim.js           the VTP simulation engine (Delaunay neighbors, repulsion + alignment + homing, Voronoi speed governor, canvas rendering) — no external libraries
assets/app.js           page wiring — tabs, sliders, MATLAB source viewer
assets/matlab_src.json  bundled MATLAB source (for the in-page code viewer)
matlab/                 MATLAB implementation (dynamics.m and the files it depends on)
```

## Running the web version

No build step. Serve the folder (the MATLAB viewer tab loads
`assets/matlab_src.json` with `fetch`, which needs http rather than `file://`):

```
python3 -m http.server 8000
```

then visit `http://localhost:8000/`. The live controls cover the number of
agents, &nu;, the lattice spacing in x and y and the half-width, and, for the
oscillating target, the frequency (slider or exact number), amplitude and
return-speed ratio of each axis, the y phase offset, and the center, plus the
circular-motion speed and radius of the whole field.

## Running the MATLAB version

```
cd matlab
matlab -r dynamics
```

or open `matlab/dynamics.m` in the MATLAB editor and run it. The target-field
settings are at the top of the file:

```matlab
grid_half      = 50;     % static lattice covers [-grid_half, grid_half]^2
grid_spacing_x = 5;      % one static target every grid_spacing_x units in x
grid_spacing_y = 5;      % ... and every grid_spacing_y units in y

osc_center  = [0 0];     % center of the oscillation
osc_amp_x   = 15;        % amplitudes
osc_amp_y   = 15;
osc_freq_x  = 0.01;      % frequencies, cycles per time step   <-- choose these
osc_freq_y  = 0.01;
osc_ratio_x = 1;         % asymmetry n: return stroke n times faster (1 = symmetric)
osc_ratio_y = 1;
osc_phase_y = 90;        % y phase offset relative to x, degrees

field_speed  = 0.2;      % speed of the whole field along its circle, units per time step (negative = clockwise)
field_radius = 20;       % radius of that circle (0 = field stays put)
```

The lattice is plotted as grey squares and the oscillating target as a red
dot. The asymmetric waveform is the local function `oscWave` at the bottom of
`dynamics.m`. `matlab/` contains `dynamics.m` plus the files it depends on:
`Target.m`, `nearestOnSegment.m`, `neighborhoods.m`, `transition.m`,
`alignTo.m`, `voronoiProjectToBoundary.m`, and (only needed if you set
`fdim = 2`) `voronoiForwardArea.m` and `poly_area.m`. MATLAB needs the
functions these use for geometry (`delaunayTriangulation`, `voronoiDiagram`,
`polyxpoly`, `polyshape`).

## Publishing to GitHub Pages

1. Create a new GitHub repository and push this folder to it (see commands
   below).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`.
4. Save — the site will be published at
   `https://<your-username>.github.io/<repo-name>/` within a minute or two.

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## Note on the JS port

The browser port implements the same VTP model as `dynamics.m` (with
`fdim = 1`, the default):

- The Delaunay triangulation is a small built-in Bowyer–Watson implementation.
  On a test configuration of 400 agents it produced exactly the same neighbor
  sets as SciPy's Delaunay.
- The speed governor is computed from the Delaunay neighbors rather than by
  intersecting a ray with the Voronoi polygon. A Voronoi cell is the
  intersection of the half-planes toward each Delaunay neighbor, so the
  distance to the boundary along a direction is the minimum of
  |d|² / (2 u·d) over neighbors with u·d > 0, and an unbounded cell gives
  tanh(∞) = 1. This is the same quantity `voronoiProjectToBoundary.m` returns.
  Repulsion, alignment, homing and the speed governor for one step matched an
  independent NumPy/SciPy implementation to machine precision.
- Initial conditions use a seeded generator with the same seeds as the MATLAB
  script (2 and 18), but MATLAB's `rng` cannot be reproduced in JavaScript, so
  the exact starting positions (and therefore trajectories) differ from
  MATLAB's. The behavior is statistically the same.
- The nearest static target is found by rounding the agent's position, taken
  in the frame that moves with the field, to the rectangular lattice (exact, and much faster than scanning every lattice point).
  I checked it against a brute-force scan on 2000 random points with zero
  mismatches. The waveform `oscWave` was also checked to be exactly
  `sin(2*pi*u)` at `n = 1`, and to spend `n/(n+1)` of the period on the outgoing
  stroke.
- In MATLAB the `Target` object is rebuilt every step (all components move with
  the field), which replaces the single `setComponent` call used before.
- Only `fdim = 1` is ported; the forward-area speed option (`fdim = 2`) is
  MATLAB-only.
- The MATLAB script was not run in MATLAB while it was being written.
