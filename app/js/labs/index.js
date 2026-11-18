import argand from "./argand.js";
import powers from "./powers.js";
import polar from "./polar.js";
import regions from "./regions.js";
import mapping from "./mapping.js";
import epsdelta from "./epsdelta.js";
import paths from "./paths.js";
import derivative from "./derivative.js";
import fourier from "./fourier.js";

export const LABS = [argand, powers, polar, regions, mapping, epsdelta, paths, derivative, fourier];
export const labById = (id) => LABS.find((l) => l.id === id);
