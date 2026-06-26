import { City, ServiceRegistry, type Diagnostic } from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import { buildSceneModel, cellToScreen } from "../../src/view/scene-model";
import { layoutCity } from "../../src/view/layout";

function registry(): ServiceRegistry {
  return ServiceRegistry.from([
    { kind: "vpc", provider: "aws", category: "network", displayName: "VPC", containment: { allowedIn: [] } },
    { kind: "subnet", provider: "aws", category: "network", displayName: "Subnet", containment: { allowedIn: ["vpc"] } },
    { kind: "ec2", provider: "aws", category: "compute", displayName: "EC2", containment: { allowedIn: ["subnet"] } },
    { kind: "security-group", provider: "aws", category: "security", displayName: "SG", containment: { allowedIn: ["vpc"] } },
  ]);
}

function sampleCity(): City {
  const city = new City(registry());
  const vpc = city.add("vpc", { id: "vpc" });
  const subnet = city.add("subnet", { id: "sn", in: vpc.id });
  city.add("ec2", { id: "web", in: subnet.id, properties: { name: "web" } });
  const sg = city.add("security-group", { id: "sg", in: vpc.id });
  city.connect(sg.id, city.require(city.byKind("ec2")[0]!.id).id, "attached-to");
  return city;
}

describe("buildSceneModel", () => {
  it("emits one node per service with screen positions from the layout", () => {
    const city = sampleCity();
    const model = buildSceneModel(city, {});
    expect(model.nodes).toHaveLength(city.all().length);

    const layout = layoutCity(city);
    const web = model.nodes.find((n) => n.id === "web")!;
    const cell = layout.get(web.id)!;
    expect({ x: web.x, y: web.y }).toEqual(cellToScreen(cell.gx, cell.gy));
  });

  it("uses properties.name as the label, falling back to kind", () => {
    const city = sampleCity();
    const model = buildSceneModel(city, {});
    expect(model.nodes.find((n) => n.id === "web")!.label).toBe("web");
    expect(model.nodes.find((n) => n.id === "vpc")!.label).toBe("vpc");
  });

  it("marks the selected node", () => {
    const city = sampleCity();
    const model = buildSceneModel(city, { selectedId: city.require(city.byKind("vpc")[0]!.id).id });
    expect(model.nodes.find((n) => n.id === "vpc")!.selected).toBe(true);
    expect(model.nodes.find((n) => n.id === "web")!.selected).toBe(false);
  });

  it("tags a node with the worst severity of diagnostics targeting it", () => {
    const city = sampleCity();
    const diagnostics: Diagnostic[] = [
      { code: "A", severity: "warning", title: "", message: "", targets: [city.byKind("ec2")[0]!.id] },
      { code: "B", severity: "error", title: "", message: "", targets: [city.byKind("ec2")[0]!.id] },
    ];
    const model = buildSceneModel(city, { diagnostics });
    expect(model.nodes.find((n) => n.id === "web")!.severity).toBe("error");
    expect(model.nodes.find((n) => n.id === "vpc")!.severity).toBeUndefined();
  });

  it("emits one edge per connection with endpoint coordinates", () => {
    const city = sampleCity();
    const model = buildSceneModel(city, {});
    expect(model.edges).toHaveLength(city.connections().length);
    const edge = model.edges[0]!;
    expect(typeof edge.fromX).toBe("number");
    expect(typeof edge.toY).toBe("number");
  });
});
