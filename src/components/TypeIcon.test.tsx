import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TypeIcon } from "./TypeIcon";
import { TYPE_LABEL } from "@/lib/labels";
import { ITEM_TYPES } from "@/lib/types";

describe("TypeIcon", () => {
  it.each(ITEM_TYPES)("tem nome acessível para o tipo %s", (type) => {
    render(<TypeIcon type={type} />);
    expect(screen.getByRole("img", { name: TYPE_LABEL[type] })).toBeInTheDocument();
  });
});
