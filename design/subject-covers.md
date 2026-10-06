# Subject covers

The six notebook covers on the Review shelf, `public/covers/<subject-id>.webp`.

- Generated 2026-10-05 on Higgsfield with `gpt_image_2_5`, 3:4, 880 × 1168 PNG, 0.25 credits each.
- Style follows the owner's sample of six pastel MTLE review-book covers: soft clay 3D objects on a flat pastel ground with a large faint circle. The sample's lettering was not reproduced; titles are HTML set over the plain top third (`subject-shelf.tsx`, `SUBJECT_COVERS` in `subject-covers.ts`).
- Processed with ImageMagick: `-resize 600x800 -quality 80 -define webp:method=6`, 12–18 KB each.
- `paper` in `SUBJECT_COVERS` is the art's top-left background colour, sampled from the PNG. Regenerating a cover means re-sampling it and re-checking the title `ink` contrast (6.7:1 or better today).

## Prompt

Shared frame, with the background colour and objects swapped per subject:

> Text-free book cover illustration in a soft matte clay 3D style, portrait. Flat pastel {colour} background with a slightly lighter large soft circle behind the objects. The top 40 percent of the image is completely empty plain background, reserved for a title added later. In the lower 60 percent: {objects}. Rounded friendly shapes, gentle studio light from the upper left, soft contact shadows, calm warm stationery mood. Absolutely no text, letters, numbers, labels, logos or writing anywhere.

| Subject                   | Colour        | Objects                                                                                                            | Job                                  |
| ------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| clinical-chemistry        | sage green    | glass Erlenmeyer flask with teal liquid, ball-and-stick molecule, rack of three test tubes (teal, amber, lavender) | eaee52c7-07ab-4899-90ea-2b39818cd1f9 |
| microbiology-parasitology | lavender      | bumpy purple microbe, rod-shaped bacteria, curled pink roundworm, petri dish with colonies                         | 11d4f686-f770-4259-80ce-ee16e3817d37 |
| clinical-microscopy       | butter yellow | cream and charcoal microscope, specimen cup with pale yellow liquid, stained glass slide, small clear crystals     | cdbd929d-82cc-4965-87ba-5db4a9258859 |
| hematology                | blush pink    | red blood cells, white blood cell with lobed purple nucleus, lavender-capped blood tube, platelets                 | 97873e90-1190-481e-a073-3d48960eaf43 |
| blood-banking-serology    | sky blue      | blood bag with a blank label, Y-shaped antibodies, a red blood cell                                                | 5ca8a354-4b56-4d23-b45a-1746bda50763 |
| histopathology-laws       | peach         | stained tissue slide, paraffin tissue block, small brass balance scale                                             | e1a26ea0-cb13-40ed-b900-5219c715b83b |
