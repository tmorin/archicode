package io.morin.archicode.workspace;

/**
 * One plateau of the chain a layered plateau is built from, as {@link LayerLoader} had it once the layer was applied: the
 * elements of the two layers, each with the {@code replaces} its own layer wrote. A comparison between two plateaus several
 * layers apart reads the steps in between to compose the {@code replaces} (wave 017, issue #89).
 *
 * @param plateau     the id of the plateau
 * @param application the elements of the application layer
 * @param technology  the elements of the technology layer
 */
public record PlateauStep(String plateau, ElementIndex application, ElementIndex technology) {}
