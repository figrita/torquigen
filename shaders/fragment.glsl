#version 300 es
precision highp float;
precision highp sampler2D;
layout(location = 0) out vec4 fragColor;
in vec2 v_uv;
uniform sampler2D u_image;
uniform float u_spread;
uniform float u_slices;
uniform float u_inputScale;
uniform float u_bloom;
uniform float u_inputXOffset;
uniform float u_inputYOffset;
uniform float u_outputXOffset;
uniform float u_outputYOffset;
uniform float u_spiralTurn; // Initial radius of the Archimedes spiral
uniform float u_spiralWidth; // Rate at which the Archimedes spiral expands
uniform float u_rotation;
uniform float u_zoomLevel;
uniform int u_iterations;
uniform int u_supersampling;
uniform float u_weightPower; // 1.0 = no power, 2.0 = square, 3.0 = cube, etc.
uniform int u_weightCombination; // 0 = average, 1 = sum, 2 = product, 3 = max, 4 = min
uniform int u_weightSquare; // 0 = no square, 1 = square
uniform float u_sampleMethod; // 0 = around-center, 1 = along-radius
uniform int u_rbftype;
uniform vec2 u_outputResolution;
uniform float u_hueRotation;
uniform float u_saturation;
uniform float u_value;

const float PI = 3.141592653589793238462643383279502884197169399375105820974944592307816406286208998628034825342;
const float INFINITY = 1.0 / 0.0;

float radialBaseFunctions(float r, float spread, int type) {
    switch(type) {
    // Previously defined RBF types
        case 0:
            return exp(-r * r / (2.0 * spread * spread)); // gaussian
        case 1:
            return 1.0 / (1.0 + (r * r) / (spread * spread)); // cauchy
        case 2:
            return sin(r / spread) * sin(r / spread); // wave
        case 3:
            return cos(r / spread) * cos(r / spread); // wave2
        case 4:
            return sqrt(r * r + spread * spread); // multiquadric
        case 5:
            return 1.0 / sqrt(r * r + spread * spread); // inverse-multiquadric
        case 6:
            return 1.0 / (r * r + spread * spread); // inverse-quadratic
        case 7:
            return exp(-r / spread) * sin(2.0 * PI * r / spread); // expSinusoidal
        case 8:
            float t = abs(r / spread);
            return t < 1.0 ? 1.0 - 3.0 * t * t + 2.0 * t * t * t : 0.0; // cubicPulse
        case 9:
            return exp(-r / spread) * cos(2.0 * PI * r / spread); // dampedCosine
        case 10:
            float x = (r / spread) * PI;
            return x == 0.0 ? 1.0 : sin(x) / x; // sinc

    // Additional RBF types
        case 11:
            return r * r * log(abs(r / spread)); // thinPlateSpline
        case 12:
            return log(1.0 + r / spread); // logarithmic
        case 13:
            return r <= spread ? pow(spread - r, 3.0) : 0.0; // spline
        case 14:
            return pow(r, spread); // polynomial
        case 15:
            return exp(-r / spread); // exponential
        case 16:
            return 1.0 / (1.0 + (r * r) / (spread * spread)); // rationalQuadratic
        case 17:
            return exp(-1.0 / (1.0 - (r * r) / (spread * spread))); // bump
        case 18:
            return r / spread; // linear
        case 19:
            return pow(r / spread, 3.0) * (r / spread + 1.0); // cubic
        case 20:
            return pow(r / spread, 5.0) * (r / spread + 1.0); // quintic
        case 21:
            return r <= spread ? pow(spread - r, 2.0) * pow(r, 2.0) * log(r / spread) : 0.0; // thinPlate
    }
}

// Calculate the position of a point given its radius and angle components
vec2 polarToXY(float phi, float r_rel) {
    // Define the center of the coordinate system
    float cx = 0.5;
    float cy = 0.5;

    // Calculate the new position using polar coordinates
    return vec2(cx + r_rel * cos(phi), cy + r_rel * sin(phi));
}

// Update the positions and weights arrays with the transformed positions and their respective weights
void updatePositionsAndWeights(vec2 uv, out vec2 positions[36], out float weights[36]) {
    // Calculate the aspect ratio and adjust the input UV coordinates accordingly
    float aspectRatio = u_outputResolution.y / u_outputResolution.x;
    uv.x += u_outputXOffset;
    uv.y += (1.0 - aspectRatio) / 2.0;
    uv.y -= u_outputYOffset;

    // Define the center of the coordinate system
    float cx = 0.5;
    float cy = 0.5;

    // Calculate the distance (radius) and angle (angleWithRotationAndSpiral) of the input point relative to the center
    float dx = uv.x - cx;
    float dy = uv.y - cy;
    float radius = sqrt(dx * dx + dy * dy) * u_zoomLevel * (u_outputResolution.x / 512.0);
    float angleWithRotation = atan(uv.y - cy, uv.x - cx) + u_rotation;
    float angleWithRotationAndSpiral = angleWithRotation;
    if(radius != 0.0){
        angleWithRotationAndSpiral += log(radius + 1.0) / u_spiralWidth * u_spiralTurn;
    }


    // Iterate over all the positions and calculate their weights
    for(int i = 0; i < 36; i++) {
        if(i >= u_iterations)
            break;

        // Calculate the relative angle and radius for the current iteration position
        float sliceAngle = float(i) *  (2.0 * PI / u_slices);
        float angleOfIteratedPoint = angleWithRotationAndSpiral + sliceAngle;

        // Ensures symmetry by making opposite points have opposite radii
        float r_rel = radius * cos(angleOfIteratedPoint);

        // Calculate the transformed position for the current iteration
        float mixAngle = mix(angleWithRotationAndSpiral, angleOfIteratedPoint, u_sampleMethod);
        vec2 newPos = polarToXY(mixAngle, r_rel);
        positions[i] = newPos;

        // Determine final weight for the current iteration
        float weight = radialBaseFunctions(r_rel, u_spread, u_rbftype);

        // Square the weight if the flag is set
        if(u_weightSquare == 1)
            weight *= weight;

        weights[i] = weight;
    }
}

// Combine the positions and weights arrays using the specified weight combination method
vec2 combinePositionsAndWeights(vec2 positions[36], float weights[36]) {
    vec2 newPosition;
    float sumX = 0.0, sumY = 0.0, sumWeight = 0.0;

    // Combine the positions using the "max" method
    if(u_weightCombination == 3) {
        float maxWeight = -INFINITY;
        for(int i = 0; i < u_iterations; i++) {
            if(weights[i] > maxWeight) {
                maxWeight = weights[i];
                newPosition = positions[i];
            }
        }
    } 
    // Combine the positions using the "min" method
    else if(u_weightCombination == 4) {
        float minWeight = INFINITY;
        for(int i = 0; i < u_iterations; i++) {
            if(weights[i] < minWeight) {
                minWeight = weights[i];
                newPosition = positions[i];
            }
        }
     // Combine the positions using other methods (sum, average, or power)
    } else {
        for(int i = 0; i < u_iterations; i++) {
        // Combine the positions using the "sum" method
            if(u_weightCombination == 0) {
                sumX += weights[i] * positions[i].x + positions[i].x;
                sumY += weights[i] * positions[i].y + positions[i].y;
                sumWeight += weights[i] + 1.0;
            } 
        // Combine the positions using the "average" method
            else if(u_weightCombination == 1) {
                sumX += weights[i] * positions[i].x;
                sumY += weights[i] * positions[i].y;
                sumWeight += weights[i];
            } 
        // Combine the positions using the "power" method
            else if(u_weightCombination == 2) {
                sumX += pow(weights[i], u_weightPower) * positions[i].x;
                sumY += pow(weights[i], u_weightPower) * positions[i].y;
                sumWeight += pow(weights[i], u_weightPower);
            }
        }
        // Calculate the final combined position
        newPosition.x = sumX / sumWeight;
        newPosition.y = sumY / sumWeight;
    }

    return newPosition;
}

// Main function to map the input point to a new position using the transformation functions
vec2 mapPoint(vec2 uv) {
    vec2 positions[36];
    float weights[36];

    // Update the positions and weights arrays with the transformed positions and their respective weights
    updatePositionsAndWeights(uv, positions, weights);

    // Combine the positions and weights arrays to calculate the final new position
    vec2 newPosition = combinePositionsAndWeights(positions, weights);

    // Return the new position
    return newPosition;
}

vec3 bloom(vec2 uv) {
    vec2 blurOffset = vec2(1.0) / u_outputResolution;
    vec3 bloomColor = vec3(0.0);
    float bloomWeight = 0.0;

    for(int x = -2; x <= 2; x++) {
        for(int y = -2; y <= 2; y++) {
            vec2 offset = vec2(float(x), float(y)) * blurOffset * 1.2;
            float weight = exp(-0.5 * length(offset) / 1.2);
            bloomWeight += weight;
            vec2 bloomUV = uv + offset;
            vec2 mappedBloomUV = mapPoint(bloomUV);
            mappedBloomUV.x = 0.5 + (mappedBloomUV.x - 0.5) * u_inputScale + u_inputXOffset;
            mappedBloomUV.y = 0.5 + (mappedBloomUV.y - 0.5) * u_inputScale - u_inputYOffset;
            vec4 samp = texture(u_image, mappedBloomUV);
            bloomColor += samp.rgb * weight * u_bloom;
        }
    }

    return bloomColor / bloomWeight;
}

vec4 supersample(vec2 uv) {
    float xStepSize = 1.0 / float(u_supersampling) * 2.0 / u_outputResolution.x;
    float yStepSize = 1.0 / float(u_supersampling) * 2.0 / u_outputResolution.y;
    float gamma = 2.2;
    vec4 accumulatedColor = vec4(0.0);
    float totalWeight = 0.0;

    for(int i = 0; i < u_supersampling; i++) {
        for(int j = 0; j < u_supersampling; j++) {
            vec2 uvOffset = vec2(float(i) * xStepSize + 0.5 * xStepSize, float(j) * yStepSize + 0.5 * yStepSize);
            vec2 sampleUV = uv + uvOffset;
            vec2 mappedUV = mapPoint(sampleUV);
            mappedUV.x = 0.5 + (mappedUV.x - 0.5) * u_inputScale + u_inputXOffset;
            mappedUV.y = 0.5 + (mappedUV.y - 0.5) * u_inputScale - u_inputYOffset;
            vec4 sampleColor = texture(u_image, mappedUV);
            sampleColor.rgb = pow(sampleColor.rgb, vec3(1.0 / gamma));
            accumulatedColor.rgb += sampleColor.rgb * sampleColor.a;
            accumulatedColor.a += sampleColor.a;
            totalWeight += 1.0;
        }
    }

    accumulatedColor.rgb /= accumulatedColor.a;
    accumulatedColor.rgb = pow(accumulatedColor.rgb, vec3(gamma));
    accumulatedColor.a /= totalWeight;
    accumulatedColor.rgb *= accumulatedColor.a;

    return accumulatedColor;
}

vec2 transform(vec2 uv) {
    uv.y = uv.y * (u_outputResolution.y / u_outputResolution.x);
    return uv;
}

// Function to convert from RGB to HSV color space
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// Function to convert from HSV to RGB color space
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec2 uv = transform(v_uv);
    vec4 color = supersample(uv);

    // Convert the RGB color to HSV
    vec3 hsv = rgb2hsv(color.rgb);

    // Apply the hue, saturation, and value adjustments
    hsv.x = mod(hsv.x + u_hueRotation, 1.0);
    hsv.y = clamp(hsv.y * u_saturation, 0.0, 1.0);
    hsv.z = clamp(hsv.z * u_value, 0.0, 1.0);

    color.rgb = hsv2rgb(hsv);

    if(u_bloom > 0.0) {
        vec3 bloomColor = bloom(uv);
        color.rgb += bloomColor;
    }

    fragColor = color;
}