@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
  let lightPosition = vec3<f32>(5.0, 10.0, 5.0);
  let lightColor = vec3<f32>(1.0, 1.0, 1.0);
  let viewPosition = vec3<f32>(cameraPosition); // Pass this uniform from CPU

  // Ambient lighting
  let ambientStrength = 0.1;
  let ambient = ambientStrength * lightColor;

  // Diffuse lighting
  let norm = normalize(input.fragNormal);
  let lightDir = normalize(lightPosition - input.fragPosition);
  let diff = max(dot(norm, lightDir), 0.0);
  let diffuse = diff * lightColor;

  // Specular lighting
  let viewDir = normalize(viewPosition - input.fragPosition);
  let reflectDir = reflect(-lightDir, norm);
  let spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
  let specularStrength = 0.5;
  let specular = specularStrength * spec * lightColor;

  // Combine results
  let color = (ambient + diffuse + specular) * input.fragColor;
  return vec4<f32>(color, 1.0);
}
