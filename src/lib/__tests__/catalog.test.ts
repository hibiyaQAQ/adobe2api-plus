import { DEFAULT_MODEL_ID, IMAGE_MODEL_CATALOG, publicModelList, referenceLimitsForVideo, resolveImageOptions, VIDEO_MODEL_CATALOG } from "@/lib/catalog";

describe("model catalog", () => {
  it("publishes the default model and deterministic ratio options", () => {
    expect(publicModelList().some((model) => model.id === DEFAULT_MODEL_ID)).toBe(true);
    expect(resolveImageOptions({}).aspectRatio).toBe("16:9");
    expect(resolveImageOptions({ aspect_ratio: "unsupported" }).aspectRatio).toBe("16:9");
  });

  it("publishes legacy Veo reference models and exact media limits", () => {
    const refModel = VIDEO_MODEL_CATALOG["veo31-ref-4s-16x9-720p"];
    expect(refModel?.referenceMode).toBe("image");
    expect(referenceLimitsForVideo(refModel)).toMatchObject({ total: 3, image: 3, video: 0, audio: 0 });
    expect(referenceLimitsForVideo(VIDEO_MODEL_CATALOG["seedance20-4s-16x9-480p"])).toMatchObject({ total: 12, image: 9, video: 3, audio: 3 });
  });

  it("honors normalized explicit image dimensions over catalog defaults", () => {
    expect(resolveImageOptions({ model: "gpt-image-2k-16x9", aspect_ratio: "1:1", output_resolution: "1K" })).toMatchObject({ aspectRatio: "1:1", outputResolution: "1K" });
  });

  it("registers GPT Image 2.5 Flare/Sunburst at their supported 1K ratios only", () => {
    for (const suffix of ["3x2", "1x1", "2x3"]) {
      expect(IMAGE_MODEL_CATALOG[`gpt-image-2.5-flare-1k-${suffix}`]).toMatchObject({ upstreamModelId: "gpt-image", upstreamModelVersion: "gpt-image-2.5-flare", outputResolution: "1K" });
      expect(IMAGE_MODEL_CATALOG[`gpt-image-2.5-sunburst-1k-${suffix}`]).toMatchObject({ upstreamModelId: "gpt-image", upstreamModelVersion: "gpt-image-2.5-prism", outputResolution: "1K" });
    }
    expect(IMAGE_MODEL_CATALOG["gpt-image-2.5-flare-1k-16x9"]).toBeUndefined();
  });

  it("publishes separate Kling3 and Kling O3 resolution variants", () => {
    expect(VIDEO_MODEL_CATALOG["kling3-5s-16x9-720p"]?.resolution).toBe("720p");
    expect(VIDEO_MODEL_CATALOG["kling3-5s-16x9-1080p"]?.resolution).toBe("1080p");
    expect(VIDEO_MODEL_CATALOG["kling3-5s-16x9"]?.resolution).toBe("720p");
    expect(VIDEO_MODEL_CATALOG["kling-o3-5s-16x9-720p"]?.resolution).toBe("720p");
    expect(VIDEO_MODEL_CATALOG["kling-o3-5s-16x9-1080p"]?.resolution).toBe("1080p");
    expect(VIDEO_MODEL_CATALOG["kling-o3-5s-16x9"]?.resolution).toBe("1080p");
  });
});
