#version 300 es
in vec4 a_position;
in vec2 a_texCoord;
out vec2 v_uv;
void main() {
    gl_Position = a_position;
    v_uv = a_texCoord;
}