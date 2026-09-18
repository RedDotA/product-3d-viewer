import * as THREE from 'three';

// CAD exports use different units. Fit the shadow volume to the actual model
// instead of spending most of the depth map on empty space around a small part.
export function fitModelShadow(light, modelBounds, groundY) {
  if (modelBounds.isEmpty()) return;

  const bounds = modelBounds.clone();
  bounds.min.y = Math.min(bounds.min.y, groundY);
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = Math.max(bounds.getSize(new THREE.Vector3()).length() * 0.5, 0.0001);
  const direction = light.position.clone().sub(light.target.position).normalize();
  if (direction.lengthSq() === 0) direction.set(4, 7, 5).normalize();

  light.target.position.copy(center);
  light.target.updateMatrixWorld();
  light.position.copy(center).addScaledVector(direction, radius * 3);

  const shadow = light.shadow;
  const extent = radius * 1.15;
  Object.assign(shadow.camera, {
    left: -extent, right: extent, top: extent, bottom: -extent,
    near: radius, far: radius * 5,
  });
  // Bias is normalized depth; normalBias is in the model's world units.
  // Keep both small enough to retain the shallow engraving and contact shadow.
  shadow.bias = -0.0001;
  shadow.normalBias = radius * 0.002;
  shadow.camera.updateProjectionMatrix();
  shadow.needsUpdate = true;
}
