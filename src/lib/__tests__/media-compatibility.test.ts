import { describe, expect, it } from "vitest";
import { buildImagePayloads, buildVideoPayload } from "@/lib/adobe/payloads";
import { resolveVideoModel } from "@/lib/catalog";
import { normalizeImageRequest, normalizeVideoRequest } from "@/lib/media-request";
import { withCanonicalProtocolModel } from "@/lib/media-response";

describe("cross-provider media compatibility", () => {
  it("maps GPT Image 1K 16:9 text-to-image and edit payloads", () => {
    const textToImage = normalizeImageRequest({ model: "gpt-image-1", prompt: "a glass house", size: "1280x720" });
    expect(textToImage).toMatchObject({ model: "gpt-image-1k-16x9", aspect_ratio: "16:9", output_resolution: "1K" });
    expect(buildImagePayloads({
      modelId: textToImage.model,
      prompt: textToImage.prompt,
      aspectRatio: textToImage.aspect_ratio,
      outputResolution: textToImage.output_resolution,
      n: textToImage.n,
    })[0]).toMatchObject({ modelId: "gpt-image", modelVersion: "2", size: { width: 1280, height: 720 } });

    const edit = normalizeImageRequest({
      model: "gpt-image-1k-16x9",
      prompt: "replace the sky",
      images: ["data:image/webp;base64,c291cmNl"],
      mask: "data:image/png;base64,bWFzaw==",
    }, "openai-edits");
    expect(edit).toMatchObject({ protocol: "openai-edits", images: ["data:image/webp;base64,c291cmNl"], mask: "data:image/png;base64,bWFzaw==" });
  });

  it("maps GPT Image 2.5 Flare/Sunburst bare aliases to their 1K square default", () => {
    const flare = normalizeImageRequest({ model: "gpt-image-2.5-flare", prompt: "a neon skyline" });
    expect(flare).toMatchObject({ model: "gpt-image-2.5-flare-1k-1x1", aspect_ratio: "1:1", output_resolution: "1K" });
    expect(buildImagePayloads({
      modelId: flare.model,
      prompt: flare.prompt,
      aspectRatio: flare.aspect_ratio,
      outputResolution: flare.output_resolution,
      n: flare.n,
    })[0]).toMatchObject({ modelId: "gpt-image", modelVersion: "gpt-image-2.5-flare", size: { width: 1024, height: 1024 } });

    const sunburst = normalizeImageRequest({ model: "gpt-image-2.5-sunburst", prompt: "a studio product shot", aspect_ratio: "3:2" });
    expect(sunburst).toMatchObject({ model: "gpt-image-2.5-sunburst-1k-1x1", aspect_ratio: "3:2", output_resolution: "1K" });
    expect(buildImagePayloads({
      modelId: sunburst.model,
      prompt: sunburst.prompt,
      aspectRatio: sunburst.aspect_ratio,
      outputResolution: sunburst.output_resolution,
      n: sunburst.n,
    })[0]).toMatchObject({ modelId: "gpt-image", modelVersion: "gpt-image-2.5-prism", size: { width: 1536, height: 1024 } });
  });

  it("accepts Kling-shaped requests for a Jimeng/Seedance model", () => {
    const canonical = withCanonicalProtocolModel({
      model_name: "jimeng",
      prompt: "a cinematic paper plane",
      duration: 5,
      aspect_ratio: "16:9",
      resolution: "1080p",
      image: "https://cdn.example/frame.png",
    }, "video");
    expect(canonical.model_name).toBe("seedance20-5s-16x9-1080p");

    const normalized = normalizeVideoRequest(canonical, "kling", "image2video");
    expect(normalized).toMatchObject({ protocol: "kling", kind: "video", model: "seedance20-5s-16x9-1080p", duration: 5, aspect_ratio: "16:9", resolution: "1080p" });
    const payload = buildVideoPayload({
      model: resolveVideoModel(normalized.model),
      prompt: normalized.prompt,
      aspectRatio: normalized.aspect_ratio,
      duration: normalized.duration,
      resolution: normalized.resolution,
      sourceImageIds: ["frame-id"],
    });
    expect(payload).toMatchObject({ modelId: "seedance", modelVersion: "seedance_2.0", duration: 5, size: { width: 1920, height: 1080 }, referenceBlobs: [{ id: "frame-id", usage: "style" }] });
  });

  it("keeps Kling 3 5s 16:9 dimensions and count through payload creation", () => {
    const normalized = normalizeVideoRequest({ model: "kling3-5s-16x9", prompt: "a paper plane", width: 1920, height: 1080, n: 2 }, "kling", "text2video");
    const payload = buildVideoPayload({
      model: resolveVideoModel(normalized.model),
      prompt: normalized.prompt,
      aspectRatio: normalized.aspect_ratio,
      duration: normalized.duration,
      resolution: normalized.resolution,
      n: normalized.n,
      width: normalized.width,
      height: normalized.height,
    });
    expect(normalized).toMatchObject({ duration: 5, aspect_ratio: "16:9", width: 1920, height: 1080, n: 2 });
    expect(payload).toMatchObject({ modelId: "kling", modelVersion: "kling_v3_standard_t2v", duration: 5, n: 2, size: { width: 1920, height: 1080 } });
  });

  it("maps resolution-specific Kling3 and Kling O3 models to upstream dimensions", () => {
    for (const [modelId, modelVersion] of [["kling3-5s-16x9-1080p", "kling_v3_standard_t2v"], ["kling-o3-5s-16x9-1080p", "kling_o3_pro_reference_to_video"]] as const) {
      const normalized = normalizeVideoRequest({ model: modelId, prompt: "a cinematic garden" }, "kling", "text2video");
      const payload = buildVideoPayload({ model: resolveVideoModel(normalized.model), prompt: normalized.prompt, aspectRatio: normalized.aspect_ratio, duration: normalized.duration, resolution: normalized.resolution });
      expect(normalized.resolution).toBe("1080p");
      expect(payload).toMatchObject({ modelId: "kling", modelVersion, size: { width: 1920, height: 1080 } });
    }
  });
});
