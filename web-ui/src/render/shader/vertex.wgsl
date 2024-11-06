struct Uniforms {
  mvpMatrix : mat4x4<f32>,
};

@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexInput {
  @location(0) position : vec3<f32>,
  @location(1) normal : vec3<f32>,
  @location(2) color : vec3<f32>,
};

struct VertexOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) fragNormal : vec3<f32>,
  @location(1) fragColor : vec3<f32>,
  @location(2) fragPosition : vec3<f32>,
};

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.mvpMatrix * vec4<f32>(input.position, 1.0);
  output.fragNormal = input.normal;
  output.fragColor = input.color;
  output.fragPosition = input.position;
  return output;
}
