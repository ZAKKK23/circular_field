%% Parameters
N = 400;
L = 1;
nu = 2.5;
tmax = 1000;

%% Target field parameters
% STATIC targets: a rectangular lattice of point targets covering the plane
% (window [-grid_half, grid_half]^2). The spacing is set separately in x
% and in y. Every agent homes toward whichever target (static or
% oscillating) is nearest to it.
grid_half      = 50;
grid_spacing_x = 5;      % one static target every grid_spacing_x units in x
grid_spacing_y = 5;      % ... and every grid_spacing_y units in y

% ONE OSCILLATING target that oscillates in BOTH x and y around osc_center:
%     x(t) = osc_center(1) + osc_amp_x*oscWave(osc_freq_x*t,                   osc_ratio_x)
%     y(t) = osc_center(2) + osc_amp_y*oscWave(osc_freq_y*t + osc_phase_y/360, osc_ratio_y)
% Each axis has its own amplitude, FREQUENCY (cycles per time step, so the
% period is 1/freq steps) and ASYMMETRY ratio. oscWave (bottom of this file)
% goes up and comes back down once per period; the ratio n is how much
% faster it comes back than it went: the outgoing stroke takes the fraction
% n/(n+1) of the period and the return stroke 1/(n+1). n = 1 is a plain
% sine, n = 3 returns three times faster, n < 1 returns slower.
osc_center  = [0 0];     % center of the oscillation
osc_amp_x   = 15;        % amplitude in x
osc_amp_y   = 15;        % amplitude in y
osc_freq_x  = 0.01;      % x frequency, cycles per time step (0.01 -> period of 100 steps)
osc_freq_y  = 0.01;      % y frequency, cycles per time step
osc_ratio_x = 1;         % x asymmetry n (return stroke n times faster; 1 = symmetric)
osc_ratio_y = 1;         % y asymmetry n
osc_phase_y = 90;        % y phase offset relative to x, in degrees (90 with equal freqs/amps = circle)
% a frequency of 0 freezes that axis at its center

% CIRCULAR MOTION of the WHOLE field: the static lattice and the oscillating
% target (with its oscillation center) all move rigidly, so the field's
% center travels on a circle of radius field_radius centered on the origin.
% At time t the field center is at field_radius*[cos(theta) sin(theta)] with
% theta = (field_speed/field_radius)*t, so one lap takes
% 2*pi*field_radius/field_speed steps.
field_speed  = 0.2;      % speed along the circle, units per time step (agents move at up to 1); negative = clockwise
field_radius = 20;       % radius of the circle (0 = the field stays put)
if field_radius > 0
    field_omega = field_speed/field_radius;   % angular velocity, rad per step
else
    field_omega = 0;
end

display=true;
fixframe = false;
frameinrad = 1.2*grid_half;   % with fixframe = true the frame is centered on the moving field

fdim = 1;
M0 = L;
if fdim==2
    M0 = pi*L^2/2;
end

filename='data.mat';
erase='';

%% Initial conditions
ic_rad=.5*sqrt(N*pi/4/.91);
rng(2);
X = ic_rad*(2*rand(N,2) - 1);
rng(18);
ang = 2*pi*rand(N,1);
U = [cos(ang) sin(ang)];

% ang = 2*pi*rand(N,1);
% n1 = rand(N,2);
% n2 = pi*rand(N,2);
% X = ic_rad*( [cos(ang) sin(ang)] + .2*n1 );
% U = [-sin(ang) cos(ang)] + .25*n2;

% sep = 10;
% X = zeros(N,2);
% X(:,2) = 4*rand(N,1) - 2;
% X(1:N/2,1) = -sep;
% X(N/2+1:end,1) = sep;
% U = zeros(N,2);
% U(1:N/2,1) = 1;
% U(N/2+1:end,1) = -1;

% rad = 3;
% sep = 4;
% r = rad*rand(N,1);
% a = 2*pi*rand(N,1);
% X = sqrt(r).*[cos(a) sin(a)];
% X(1:N/2,1) = X(1:N/2,1) + sep;
% X(N/2+1:end,1) = X(N/2+1:end,1) - sep;
% U = [-sin(a) cos(a)];

% X = zeros(N,2);
% X(1:N/2,2) = 5;
% X(N/2+1:end,2) = -5;
% X(:,1) = 100*rand(N,1) - 25;
% U = zeros(N,2);
% U(1:N/2,1) = 1;
% U(N/2+1,end) = -1;

%% Initialize targets

% sR = [sep sep; -4 4]';
% sL = [-sep -sep; -4 4]';
% R = [.8 .8 .6 .5; .7 .9 .9 .6]';
% tar = Target({sL,sR},[1 2]);
ids = ones(N,1);
ids(1:N/2) = 2;
% tar = Target(1*[1 -1 -1 1; 1 1 -1 -1]');
% tar = Target([0 0]);
% tar = Target({[-w/2 0],[w/2 0]});
tar_rad = 4;
tar_ang = 2*pi/3;
tar = Target({tar_rad*[1 0],tar_rad*[cos(tar_ang) sin(tar_ang)],tar_rad*[cos(2*tar_ang) sin(2*tar_ang)]});
% tar = Target();

% --- static lattice of point targets + one oscillating target ---------
[gx,gy] = meshgrid(-grid_half:grid_spacing_x:grid_half, -grid_half:grid_spacing_y:grid_half);
staticPts = [gx(:) gy(:)];
nStatic = size(staticPts,1);
oscPos = @(t) osc_center + [ osc_amp_x*oscWave(osc_freq_x*t, osc_ratio_x), ...
                             osc_amp_y*oscWave(osc_freq_y*t + osc_phase_y/360, osc_ratio_y) ];
fieldOff = @(t) field_radius*[cos(field_omega*t) sin(field_omega*t)];   % where the field center is at time t

% components 1..nStatic are the lattice points; the LAST component is the
% oscillating target. The Target is rebuilt every step below, because every
% component moves with the field.
comps = [ mat2cell(staticPts + fieldOff(0), ones(nStatic,1), 2); {oscPos(0) + fieldOff(0)} ];
tar = Target(comps);

%% Preallocation of some intermediate variables
[r,a,h0,h,s,l,rho] = deal(zeros(N,1));
U1 = zeros(N,2);
Q = zeros(N,2);

%% Preallocation of time series variables
U_t = zeros(N,2,tmax);
DT_t = cell(tmax,1);


for t = 1:tmax
%% Compute step

% move the whole field around its circle and the oscillating target within it
off = fieldOff(t);
tar = Target([ mat2cell(staticPts + off, ones(nStatic,1), 2); {oscPos(t) + off} ]);

DT = delaunayTriangulation(X);
DT_t{t} = DT;
U_t(:,:,t) = U;
[nbhd, nearest, d] = neighborhoods(DT);
fun = @(x) transition(x,'expReciprocal');
s = arrayfun(fun, d/L);

% repulsion
r = X - X(nearest,:);
rnorm = vecnorm(r,2,2);
r = s .* r./rnorm;  % rescale to length s

% alignment
a = alignTo(U,nbhd,'expReciprocal');

% homing
h0 = homeToTarget(tar,X);
h = (1-s) .* h0./vecnorm(h0,2,2);   % rescale to length 1-s
h(isnan(h)) = 0;                    % protect 0 entries

% direction
U1 = (r + h + nu*a)./(1 + nu);

% speed
[~,l] = voronoiProjectToBoundary(DT,U1);
M = l;
if fdim==2
    M = voronoiForwardArea(DT,U1);
end

%% plot
if display==true
    clipToVoronoi=false;
    
    fig = figure(1);
    scatter(X(:,1), X(:,2), '.k');
    hold on
    % triplot(DT,'b');
    % text(X(:,1),X(:,2),num2cell(1:N));
    
    % vor = voronoi(DT);
    % vor(2).Color = 'k';
    
    qs = 1;
    % quiver(X(:,1),X(:,2),qs*r(:,1),qs*r(:,2),'off', 'r');
    % quiver(X(:,1),X(:,2),qs*h(:,1),qs*h(:,2),'off', 'g');
    % quiver(X(:,1),X(:,2),qs*a(:,1),qs*a(:,2), 'off', 'b');
    
    % quiver(X(:,1),X(:,2),qs*U(:,1),qs*U(:,2),'off', 'b');
    quiver(X(:,1),X(:,2),qs*U1(:,1),qs*U1(:,2), 'b');
    
    % plot([X(:,1) Q(:,1)]', [X(:,2) Q(:,2)]', 'r:', 'LineWidth', 1);
    % s = min(l);
    % quiver(X(:,1), X(:,2), s*U(:,1), s*U(:,2), 'off', 'r', 'ShowArrowHead', 1, 'LineWidth', 1);
    % scatter(Q(:,1), Q(:,2), '*b');
    
    C = tar.Components;
    for m=1:size(C,1)
        if isa(C{m},'polyshape')
            plot(C{m},'EdgeColor','none');
        end
    end
    
    % static lattice targets (grey) and the oscillating target (red)
    scatter(staticPts(:,1)+off(1), staticPts(:,2)+off(2), 25, [.5 .5 .5], 's');
    po = oscPos(t) + off;
    scatter(po(1), po(2), 80, 'r', 'filled');
    
    
    hold off
    
    clip = [min(X,[],1); max(X,[],1)];
    if clipToVoronoi==true
        V = voronoiDiagram(DT);
        clip = [min([V; X],[],1); max([V(2:end,:); X],[],1)];
    end
    clip_width = 1.2*max(clip(2,:)-clip(1,:));
    clip_center = mean(clip,1);
    clip_lim(1:4) = clip_center(ceil((1:4)/2)) - rescale(mod(1:4,2),-1,1)*.5*clip_width;
    
    axis equal
    
    
    frame = [-frameinrad frameinrad -frameinrad frameinrad] + [off(1) off(1) off(2) off(2)];
    if ~fixframe
        com = mean(X);
        rmed = sqrt(median((X(:,1)-com(1)).^2+(X(:,2)-com(2)).^2));
        frame = [com(1)-3*rmed com(1)+3*rmed com(2)-3*rmed com(2)+3*rmed];
    end
    axis(frame);
    title(['$t=',num2str(t),',\; f_x=',num2str(osc_freq_x),',\; f_y=',num2str(osc_freq_y),',\; n=(',num2str(osc_ratio_x),',',num2str(osc_ratio_y),'),\; v_{field}=',num2str(field_speed),',\; R_{field}=',num2str(field_radius),'$'], 'Interpreter', 'Latex');
end

%% Update

U = tanh(M/M0).*U1;
X = X + U;

%% display progress

barwidth = 60;
frac = floor(t/tmax * barwidth);
fracpct = t/tmax*100;
sofar = repmat(sprintf('\x0023'),1,frac);
yet = repmat('-',1,barwidth-frac);
progbar = ['[' sofar yet ']' ' ' sprintf('%04.1f\t%s',fracpct,filename) newline];
fprintf([erase progbar]);
erase = repmat(sprintf('\b'),1,length(progbar));
end


save("data.mat",'DT_t','U_t');


%% Local functions
function w = oscWave(u, n)
% Asymmetric periodic waveform with values in [-1, 1].
%   u : position in the cycle (any real number; only mod(u,1) matters)
%   n : speed ratio. The outgoing stroke (-1 -> +1) takes the fraction
%       p = n/(n+1) of the period and the return stroke (+1 -> -1) takes
%       1-p, so the return is n times faster than the outgoing stroke.
% Both strokes are half-cosines, so the motion is smooth at the turning
% points. u = 0 is the midpoint of the outgoing stroke (w = 0, moving up),
% and n = 1 gives exactly sin(2*pi*u).
p = n/(n+1);
v = mod(u + p/2, 1);
if v < p
    w = -cos(pi*v/p);
else
    w = cos(pi*(v-p)/(1-p));
end
end
