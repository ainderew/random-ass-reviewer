import { Document, NodeIO, type Primitive } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import type { MeshBuilder } from './mesh-builder';

let io: NodeIO | null = null;

export async function getIO(): Promise<NodeIO> {
  if (io) return io;
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
  });
  return io;
}

export interface EmissiveOptions {
  emissive?: readonly [number, number, number];
  // Materials named emissive_* are driven by the night controller.
  materialName?: string;
}

// One mesh, one vertex-coloured material, one node. Tripo3D output is also
// single-material, which is what instancing wants.
export function documentFromBuilders(
  name: string,
  parts: ReadonlyArray<{ builder: MeshBuilder; options?: EmissiveOptions }>,
): Document {
  const doc = new Document();
  const buffer = doc.createBuffer('main');
  const mesh = doc.createMesh(name);

  parts.forEach(({ builder, options }, index) => {
    const material = doc
      .createMaterial(options?.materialName ?? `${name}_${index}`)
      .setBaseColorFactor([1, 1, 1, 1])
      .setMetallicFactor(0)
      .setRoughnessFactor(0.9);
    if (options?.emissive) material.setEmissiveFactor([...options.emissive]);

    const position = doc
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array(builder.positions))
      .setBuffer(buffer);
    const normal = doc
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array(builder.normals))
      .setBuffer(buffer);
    const color = doc
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array(builder.colors))
      .setBuffer(buffer);

    const primitive = doc
      .createPrimitive()
      .setAttribute('POSITION', position)
      .setAttribute('NORMAL', normal)
      .setAttribute('COLOR_0', color)
      .setMaterial(material);
    mesh.addPrimitive(primitive);
  });

  const node = doc.createNode(name).setMesh(mesh);
  const scene = doc.createScene(name).addChild(node);
  doc.getRoot().setDefaultScene(scene);
  return doc;
}

function primitiveTriangles(primitive: Primitive): number {
  const indices = primitive.getIndices();
  if (indices) return Math.floor(indices.getCount() / 3);
  const position = primitive.getAttribute('POSITION');
  return position ? Math.floor(position.getCount() / 3) : 0;
}

export function countTriangles(doc: Document): number {
  let total = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives())
      total += primitiveTriangles(primitive);
  }
  return total;
}
