struct Uniforms {
  projectionMatrix: mat4x4<f32>,
};
@binding(0) @group(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) color: vec3<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec3<f32>,
};

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  let position = vec4<f32>(input.position, 0.0, 1.0);
  output.position = uniforms.projectionMatrix * position;
  output.color = input.color;
  return output;
}

