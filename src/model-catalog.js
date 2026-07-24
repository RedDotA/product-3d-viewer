export function selectPublicModel(catalog, requestedId = '') {
  if (!catalog || typeof catalog !== 'object' || !catalog.models || typeof catalog.models !== 'object') {
    throw new Error('模型目录格式不正确');
  }

  const modelId = requestedId || catalog.default;
  if (!modelId || !catalog.models[modelId]) {
    throw new Error('分享链接无效或模型不存在');
  }

  const config = catalog.models[modelId];
  if (!config.modelUrl || typeof config.modelUrl !== 'string') {
    throw new Error('模型地址尚未配置');
  }

  return { ...config, id: modelId };
}
