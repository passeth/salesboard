// ============================================================
// Figma Plugin Console helper
// Trade Intel token setup
//
// Usage:
//   1. Open the Trade Intel file in Figma
//   2. Plugins -> Development -> Open console
//   3. Paste this file into the console and run it
// ============================================================

(async () => {
  const FONT_FAMILY = "Inter";
  const TARGET_MODE_NAME = "Light";

  const COLOR_GROUPS = [
    {
      title: "Core",
      items: [
        ["primary/DEFAULT", "#605BFF"],
        ["primary/foreground", "#FFFFFF"],
        ["secondary/DEFAULT", "#E4E0FB"],
        ["secondary/foreground", "#605BFF"],
        ["destructive/DEFAULT", "#D11A2A"],
        ["destructive/foreground", "#FFFFFF"],
        ["accent/DEFAULT", "#E4E0FB"],
        ["accent/foreground", "#605BFF"],
        ["muted/DEFAULT", "#F7F7F8"],
        ["muted/foreground", "#7E7E8F"],
        ["background", "#FAFAFB"],
        ["foreground", "#030229"],
        ["card/DEFAULT", "#FFFFFF"],
        ["card/foreground", "#030229"],
        ["border", "#E5E7EB"],
        ["input", "#E5E7EB"],
        ["ring", "#605BFF"]
      ]
    },
    {
      title: "Semantic",
      items: [
        ["semantic/success", "#3A974C"],
        ["semantic/success-fg", "#FFFFFF"],
        ["semantic/success-bg", "#E8F5E9"],
        ["semantic/warning", "#F29339"],
        ["semantic/warning-fg", "#FFFFFF"],
        ["semantic/warning-bg", "#FFF3E0"],
        ["semantic/error", "#D11A2A"],
        ["semantic/error-fg", "#FFFFFF"],
        ["semantic/error-bg", "#FDECEA"],
        ["semantic/info", "#25C0E2"],
        ["semantic/info-fg", "#FFFFFF"],
        ["semantic/info-bg", "#E0F7FA"]
      ]
    },
    {
      title: "Sidebar",
      items: [
        ["sidebar/bg", "#030229"],
        ["sidebar/foreground", "#FFFFFF"],
        ["sidebar/accent", "#605BFF"],
        ["sidebar/muted", "#1A1942"],
        ["sidebar/inactive", "#A0A0B0"]
      ]
    },
    {
      title: "Status",
      items: [
        ["status/draft", "#94A3B8"],
        ["status/submitted", "#605BFF"],
        ["status/vendor-review", "#8B5CF6"],
        ["status/sales-review", "#605BFF"],
        ["status/needs-decision", "#F29339"],
        ["status/confirmed", "#3A974C"],
        ["status/rejected", "#D11A2A"],
        ["status/invoiced", "#0891B2"],
        ["status/partially-shipped", "#F59E0B"],
        ["status/shipped", "#2563EB"],
        ["status/completed", "#16A34A"],
        ["status/cancelled", "#6B7280"]
      ]
    }
  ];

  const FLOAT_TOKENS = [
    ["radius/none", 0],
    ["radius/s", 5],
    ["radius/m", 10],
    ["radius/l", 12],
    ["radius/pill", 20],
    ["spacing/0", 0],
    ["spacing/1", 4],
    ["spacing/2", 6],
    ["spacing/3", 8],
    ["spacing/4", 10],
    ["spacing/5", 12],
    ["spacing/6", 16],
    ["spacing/8", 20],
    ["spacing/10", 24],
    ["spacing/12", 32],
    ["spacing/16", 64],
    ["fontSize/xs", 12],
    ["fontSize/sm", 13],
    ["fontSize/base", 14],
    ["fontSize/lg", 16],
    ["fontSize/xl", 20],
    ["fontSize/2xl", 24],
    ["fontSize/3xl", 28],
    ["fontSize/4xl", 36]
  ];

  const TYPOGRAPHY_STRING_TOKENS = [
    ["font/primary", "Inter"],
    ["font/secondary", "Inter"]
  ];

  const TYPOGRAPHY_FLOAT_TOKENS = [
    ["fontWeight/normal", 400],
    ["fontWeight/medium", 500],
    ["fontWeight/semibold", 600],
    ["fontWeight/bold", 700]
  ];

  const COMPONENT_TOKEN_TREE = {
    button: {
      sm: { height: 32, padding: [6, 12], gap: 6, iconSize: 14, fontSize: 12 },
      md: { height: 40, padding: [10, 20], gap: 8, iconSize: 16, fontSize: 14 },
      lg: { height: 48, padding: [12, 24], gap: 8, iconSize: 18, fontSize: 16 },
      icon: { height: 40, width: 40, padding: [0, 0], iconSize: 18 }
    },
    toggle: {
      sm: { width: 36, height: 20, thumbSize: 16 },
      md: { width: 44, height: 24, thumbSize: 20 },
      lg: { width: 52, height: 28, thumbSize: 24 }
    },
    input: {
      sm: { height: 32, padding: [0, 8], fontSize: 12, labelGap: 4 },
      md: { height: 40, padding: [0, 12], fontSize: 14, labelGap: 6 },
      lg: { height: 48, padding: [0, 16], fontSize: 16, labelGap: 8 },
      gap: 8
    },
    badge: {
      sm: { padding: [2, 6], fontSize: 10 },
      md: { padding: [4, 10], fontSize: 12 },
      lg: { padding: [6, 14], fontSize: 14 },
      gap: 4
    },
    card: {
      headerPadding: [20, 24],
      contentPadding: [0, 24, 20, 24],
      gap: 4
    },
    table: {
      headerHeight: 44,
      rowHeight: 52,
      cellPadding: [0, 8]
    },
    sidebar: {
      width: 240,
      itemPadding: [10, 16],
      itemGap: 12,
      containerPadding: [24, 16]
    },
    headerBar: {
      height: 64,
      padding: [0, 32],
      avatarSize: 36
    },
    select: {
      height: 40,
      padding: [0, 12],
      optionHeight: 36,
      fontSize: 14,
      labelGap: 6
    },
    tabs: {
      padding: [10, 16],
      fontSize: 14,
      borderWidth: 2,
      gap: 0
    },
    modal: {
      sm: { width: 400 },
      md: { width: 480 },
      lg: { width: 640 },
      headerPadding: [24, 24, 0, 24],
      bodyPadding: [16, 24],
      footerPadding: [0, 24, 24, 24],
      gap: 8,
      titleSize: 18,
      closeSize: 20
    },
    avatar: {
      sm: { size: 28, fontSize: 11 },
      md: { size: 36, fontSize: 14 },
      lg: { size: 48, fontSize: 18 }
    },
    toast: {
      width: 360,
      padding: [16, 16],
      gap: 12,
      titleSize: 14,
      descSize: 13,
      iconSize: 20,
      closeSize: 16
    },
    tooltip: {
      padding: [6, 10],
      fontSize: 12
    },
    pagination: {
      itemSize: 32,
      gap: 4,
      fontSize: 13,
      iconSize: 16
    },
    checkbox: {
      size: 18,
      checkSize: 12,
      borderWidth: 1.5
    },
    spinner: {
      sm: { size: 16, strokeWidth: 2 },
      md: { size: 24, strokeWidth: 2 },
      lg: { size: 36, strokeWidth: 3 }
    },
    emptyState: {
      iconSize: 48,
      titleSize: 16,
      descSize: 14,
      padding: [40, 24],
      gap: 12
    },
    divider: {
      thickness: 1
    }
  };

  const BUTTON_VARIANTS = [
    { key: "Primary", fill: "#605BFF", stroke: null, labelFill: "#FFFFFF" },
    { key: "Outline", fill: "#FFFFFF", stroke: "#E5E7EB", labelFill: "#030229" },
    { key: "Ghost", fill: null, stroke: null, labelFill: "#030229" },
    { key: "Destructive", fill: "#D11A2A", stroke: null, labelFill: "#FFFFFF" }
  ];

  const BUTTON_SIZES = [
    {
      key: "sm",
      width: 92,
      height: COMPONENT_TOKEN_TREE.button.sm.height,
      radius: 5,
      fontSize: COMPONENT_TOKEN_TREE.button.sm.fontSize
    },
    {
      key: "md",
      width: 112,
      height: COMPONENT_TOKEN_TREE.button.md.height,
      radius: 10,
      fontSize: COMPONENT_TOKEN_TREE.button.md.fontSize
    },
    {
      key: "lg",
      width: 132,
      height: COMPONENT_TOKEN_TREE.button.lg.height,
      radius: 10,
      fontSize: COMPONENT_TOKEN_TREE.button.lg.fontSize
    }
  ];

  const TOGGLE_SPECS = [
    {
      key: "sm",
      width: COMPONENT_TOKEN_TREE.toggle.sm.width,
      height: COMPONENT_TOKEN_TREE.toggle.sm.height,
      thumb: COMPONENT_TOKEN_TREE.toggle.sm.thumbSize
    },
    {
      key: "md",
      width: COMPONENT_TOKEN_TREE.toggle.md.width,
      height: COMPONENT_TOKEN_TREE.toggle.md.height,
      thumb: COMPONENT_TOKEN_TREE.toggle.md.thumbSize
    },
    {
      key: "lg",
      width: COMPONENT_TOKEN_TREE.toggle.lg.width,
      height: COMPONENT_TOKEN_TREE.toggle.lg.height,
      thumb: COMPONENT_TOKEN_TREE.toggle.lg.thumbSize
    }
  ];

  const BADGES = [
    { key: "Default", fill: "#E4E0FB", labelFill: "#605BFF" },
    { key: "Success", fill: "#E8F5E9", labelFill: "#3A974C" },
    { key: "Warning", fill: "#FFF3E0", labelFill: "#F29339" },
    { key: "Error", fill: "#FDECEA", labelFill: "#D11A2A" }
  ];

  const AVATAR_SIZES = [
    {
      key: "sm",
      size: COMPONENT_TOKEN_TREE.avatar.sm.size,
      fontSize: COMPONENT_TOKEN_TREE.avatar.sm.fontSize
    },
    {
      key: "md",
      size: COMPONENT_TOKEN_TREE.avatar.md.size,
      fontSize: COMPONENT_TOKEN_TREE.avatar.md.fontSize
    },
    {
      key: "lg",
      size: COMPONENT_TOKEN_TREE.avatar.lg.size,
      fontSize: COMPONENT_TOKEN_TREE.avatar.lg.fontSize
    }
  ];

  const COMPONENT_FLOAT_TOKENS = flattenTokenTree(COMPONENT_TOKEN_TREE);

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    return {
      r: parseInt(value.slice(0, 2), 16) / 255,
      g: parseInt(value.slice(2, 4), 16) / 255,
      b: parseInt(value.slice(4, 6), 16) / 255
    };
  }

  function solidPaint(hex) {
    return { type: "SOLID", color: hexToRgb(hex) };
  }

  function countItems(groups) {
    return groups.reduce((sum, group) => sum + group.items.length, 0);
  }

  function flattenTokenTree(tree, prefix = "") {
    const entries = [];

    for (const [key, value] of Object.entries(tree)) {
      const nextPrefix = prefix ? `${prefix}/${key}` : key;

      if (typeof value === "number") {
        entries.push([nextPrefix, value]);
        continue;
      }

      if (Array.isArray(value)) {
        if (value.length === 2) {
          entries.push([`${nextPrefix}Y`, value[0]]);
          entries.push([`${nextPrefix}X`, value[1]]);
        } else if (value.length === 4) {
          entries.push([`${nextPrefix}Top`, value[0]]);
          entries.push([`${nextPrefix}Right`, value[1]]);
          entries.push([`${nextPrefix}Bottom`, value[2]]);
          entries.push([`${nextPrefix}Left`, value[3]]);
        }
        continue;
      }

      if (value && typeof value === "object") {
        entries.push(...flattenTokenTree(value, nextPrefix));
      }
    }

    return entries;
  }

  function clearPage(page) {
    while (page.children.length > 0) {
      page.children[0].remove();
    }
  }

  function removeEmptyPages() {
    const pages = [...figma.root.children];
    const emptyPages = pages.filter((page) => page.children.length === 0);
    const hasNonEmptyPage = pages.some((page) => page.children.length > 0);

    if (!hasNonEmptyPage && emptyPages.length > 0) {
      for (const page of emptyPages.slice(1)) {
        page.remove();
      }
      return emptyPages[0];
    }

    for (const page of emptyPages) {
      page.remove();
    }
    return null;
  }

  function getOrCreatePage(name, reusablePageRef) {
    const existingPage = figma.root.children.find((page) => page.name === name);
    if (existingPage) {
      clearPage(existingPage);
      return existingPage;
    }

    if (reusablePageRef.current) {
      const page = reusablePageRef.current;
      reusablePageRef.current = null;
      page.name = name;
      clearPage(page);
      return page;
    }

    const page = figma.createPage();
    page.name = name;
    return page;
  }

  async function loadFonts() {
    await figma.loadFontAsync({ family: FONT_FAMILY, style: "Regular" });
    await figma.loadFontAsync({ family: FONT_FAMILY, style: "Medium" });
    await figma.loadFontAsync({ family: FONT_FAMILY, style: "Semi Bold" });
    await figma.loadFontAsync({ family: FONT_FAMILY, style: "Bold" });
  }

  function makeText(text, options = {}) {
    const node = figma.createText();
    node.fontName = { family: FONT_FAMILY, style: options.fontStyle || "Regular" };
    node.characters = text;
    node.fontSize = options.fontSize || 14;
    node.fills = [solidPaint(options.fill || "#030229")];
    if (options.alignHorizontal) {
      node.textAlignHorizontal = options.alignHorizontal;
    }
    if (options.alignVertical) {
      node.textAlignVertical = options.alignVertical;
    }
    return node;
  }

  function addCanvasText(parent, text, x, y, options = {}) {
    const node = makeText(text, options);
    node.x = x;
    node.y = y;
    parent.appendChild(node);
    return node;
  }

  function addCenteredText(frame, text, options = {}) {
    const node = makeText(text, options);
    frame.appendChild(node);
    node.x = Math.round((frame.width - node.width) / 2 + (options.offsetX || 0));
    node.y = Math.round((frame.height - node.height) / 2 + (options.offsetY || 0));
    return node;
  }

  function bindTextVariable(node, field, variable) {
    if (!variable || typeof node.setBoundVariable !== "function") {
      return;
    }

    node.setBoundVariable(field, variable);
  }

  function bindUniformRadius(node, variable) {
    if (!variable || typeof node.setBoundVariable !== "function") {
      return;
    }

    ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"].forEach((field) => {
      node.setBoundVariable(field, variable);
    });
  }

  function setFrameFill(frame, hex, variable) {
    if (!hex) {
      frame.fills = [];
      return;
    }

    const paint = variable
      ? figma.variables.setBoundVariableForPaint(solidPaint(hex), "color", variable)
      : solidPaint(hex);

    frame.fills = [paint];
  }

  function setStroke(frame, hex) {
    if (!hex) {
      frame.strokes = [];
      return;
    }

    frame.strokes = [solidPaint(hex)];
    frame.strokeWeight = 1;
  }

  function addBottomBorder(frame, hex) {
    const border = figma.createRectangle();
    border.name = "border";
    border.resize(frame.width, 1);
    border.x = 0;
    border.y = frame.height - 1;
    border.fills = [solidPaint(hex)];
    frame.appendChild(border);
    return border;
  }

  function createShapeFrame(name, width, height, x, y, options = {}) {
    const frame = figma.createFrame();
    frame.name = name;
    frame.resize(width, height);
    frame.x = x;
    frame.y = y;
    frame.cornerRadius = options.cornerRadius || 0;
    setFrameFill(frame, options.fill || null, options.fillVariable || null);
    setStroke(frame, options.stroke || null);
    return frame;
  }

  async function getOrCreateCollection(name) {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    let collection = collections.find((item) => !item.remote && item.name === name);
    if (!collection) {
      collection = figma.variables.createVariableCollection(name);
    }

    if (collection.modes[0].name !== TARGET_MODE_NAME) {
      collection.renameMode(collection.modes[0].modeId, TARGET_MODE_NAME);
    }

    while (collection.modes.length > 1) {
      collection.removeMode(collection.modes[collection.modes.length - 1].modeId);
    }

    return collection;
  }

  function inferVariableScopes(name, resolvedType) {
    if (name.startsWith("radius/")) {
      return ["CORNER_RADIUS"];
    }
    if (name.startsWith("fontSize/")) {
      return ["FONT_SIZE"];
    }
    if (name.startsWith("fontWeight/")) {
      return ["FONT_WEIGHT"];
    }
    if (resolvedType === "STRING" && name.startsWith("font/")) {
      return ["FONT_FAMILY"];
    }
    return ["ALL_SCOPES"];
  }

  async function syncVariables(collection, resolvedType, definitions) {
    const modeId = collection.modes[0].modeId;
    const localVariables = await figma.variables.getLocalVariablesAsync(resolvedType);
    const collectionVariables = localVariables.filter(
      (variable) => variable.variableCollectionId === collection.id
    );
    const expectedNames = new Set(definitions.map(([name]) => name));

    for (const variable of collectionVariables) {
      if (!expectedNames.has(variable.name)) {
        variable.remove();
      }
    }

    const refreshedVariables = await figma.variables.getLocalVariablesAsync(resolvedType);
    const byName = new Map(
      refreshedVariables
        .filter((variable) => variable.variableCollectionId === collection.id)
        .map((variable) => [variable.name, variable])
    );

    const result = new Map();

    for (const [name, value] of definitions) {
      let variable = byName.get(name);
      if (!variable) {
        variable = figma.variables.createVariable(name, collection, resolvedType);
      }

      variable.name = name;
      variable.scopes = inferVariableScopes(name, resolvedType);
      variable.setValueForMode(modeId, resolvedType === "COLOR" ? hexToRgb(value) : value);
      result.set(name, variable);
    }

    return result;
  }

  function buildColorsPage(page, colorCollection, colorVariables) {
    clearPage(page);
    page.setExplicitVariableModeForCollection(colorCollection, colorCollection.modes[0].modeId);

    let y = 0;

    for (const group of COLOR_GROUPS) {
      addCanvasText(page, group.title, 0, y, { fontSize: 20, fontStyle: "Bold" });
      const swatchTop = y + 40;

      group.items.forEach(([name, hex], index) => {
        const x = (index % 10) * 100;
        const row = Math.floor(index / 10);
        const frame = createShapeFrame(name, 80, 80, x, swatchTop + row * 100, {
          cornerRadius: 8,
          fill: hex,
          fillVariable: colorVariables.get(name)
        });
        page.appendChild(frame);
      });

      y = swatchTop + Math.ceil(group.items.length / 10) * 100 + 120;
    }
  }

  function buildButtonsSection(page, startY) {
    addCanvasText(page, "Buttons", 0, startY, { fontSize: 20, fontStyle: "Bold" });
    const gridTop = startY + 42;
    const gridLeft = 120;
    const columnWidth = 160;
    const rowHeight = 72;

    BUTTON_VARIANTS.forEach((variant, index) => {
      addCanvasText(page, variant.key, gridLeft + index * columnWidth, gridTop, {
        fontSize: 12,
        fontStyle: "Medium",
        fill: "#7E7E8F"
      });
    });

    BUTTON_SIZES.forEach((size, rowIndex) => {
      const rowY = gridTop + 24 + rowIndex * rowHeight;
      addCanvasText(page, size.key, 0, rowY + Math.max((size.height - 16) / 2, 0), {
        fontSize: 12,
        fontStyle: "Medium",
        fill: "#7E7E8F"
      });

      BUTTON_VARIANTS.forEach((variant, columnIndex) => {
        const x = gridLeft + columnIndex * columnWidth;
        const frame = createShapeFrame(
          `Button/${variant.key}/${size.key}`,
          size.width,
          size.height,
          x,
          rowY,
          {
            cornerRadius: size.radius,
            fill: variant.fill,
            stroke: variant.stroke
          }
        );
        page.appendChild(frame);
        addCenteredText(frame, variant.key, {
          fontSize: size.fontSize,
          fontStyle: "Medium",
          fill: variant.labelFill
        });
      });
    });

    addCanvasText(page, "Icon", 820, gridTop, {
      fontSize: 12,
      fontStyle: "Medium",
      fill: "#7E7E8F"
    });
    const iconButton = createShapeFrame("Button/Icon", 40, 40, 820, gridTop + 30, {
      cornerRadius: 10,
      fill: "#E4E0FB"
    });
    page.appendChild(iconButton);
    addCenteredText(iconButton, "+", {
      fontSize: 18,
      fontStyle: "Bold",
      fill: "#605BFF"
    });

    return gridTop + 24 + BUTTON_SIZES.length * rowHeight + 40;
  }

  function buildTogglesSection(page, startY) {
    addCanvasText(page, "Toggle", 0, startY, { fontSize: 20, fontStyle: "Bold" });
    const sectionTop = startY + 42;
    const rowGap = 56;

    TOGGLE_SPECS.forEach((spec, index) => {
      const y = sectionTop + index * rowGap;
      addCanvasText(page, spec.key, 0, y + 4, {
        fontSize: 12,
        fontStyle: "Medium",
        fill: "#7E7E8F"
      });

      ["off", "on"].forEach((state, stateIndex) => {
        const x = 120 + stateIndex * 140;
        const fill = state === "on" ? "#605BFF" : "#E5E7EB";
        const frame = createShapeFrame(`Toggle/${spec.key}/${state}`, spec.width, spec.height, x, y, {
          cornerRadius: spec.height / 2,
          fill
        });
        page.appendChild(frame);

        const thumb = figma.createEllipse();
        thumb.name = "thumb";
        thumb.resize(spec.thumb, spec.thumb);
        thumb.fills = [solidPaint("#FFFFFF")];
        thumb.x = state === "on" ? spec.width - spec.thumb - 2 : 2;
        thumb.y = (spec.height - spec.thumb) / 2;
        frame.appendChild(thumb);
      });
    });

    return sectionTop + TOGGLE_SPECS.length * rowGap + 32;
  }

  function buildBadgesSection(page, startY) {
    addCanvasText(page, "Badge", 0, startY, { fontSize: 20, fontStyle: "Bold" });
    const y = startY + 42;

    BADGES.forEach((badge, index) => {
      const frame = createShapeFrame(`Badge/${badge.key}`, 80, 28, index * 100, y, {
        cornerRadius: 20,
        fill: badge.fill
      });
      page.appendChild(frame);
      addCenteredText(frame, badge.key, {
        fontSize: 12,
        fontStyle: "Medium",
        fill: badge.labelFill
      });
    });

    return y + 68;
  }

  function buildInputCardSection(page, startY) {
    addCanvasText(page, "Input / Card", 0, startY, { fontSize: 20, fontStyle: "Bold" });
    const y = startY + 42;

    const input = createShapeFrame("Input", 280, COMPONENT_TOKEN_TREE.input.md.height, 0, y, {
      cornerRadius: 10,
      fill: "#FFFFFF",
      stroke: "#E5E7EB"
    });
    page.appendChild(input);
    addCanvasText(input, "Order number", COMPONENT_TOKEN_TREE.input.md.padding[1], 11, {
      fontSize: COMPONENT_TOKEN_TREE.input.md.fontSize,
      fill: "#7E7E8F"
    });

    const card = createShapeFrame("Card", 320, 200, 340, y, {
      cornerRadius: 12,
      fill: "#FFFFFF",
      stroke: "#E5E7EB"
    });
    page.appendChild(card);
    addCanvasText(card, "Trade Intel Card", 20, COMPONENT_TOKEN_TREE.card.headerPadding[0], {
      fontSize: 16,
      fontStyle: "Bold"
    });
    const line1 = figma.createRectangle();
    line1.name = "content-line-1";
    line1.resize(220, 12);
    line1.x = 20;
    line1.y = 60;
    line1.cornerRadius = 6;
    line1.fills = [solidPaint("#F7F7F8")];
    card.appendChild(line1);
    const line2 = figma.createRectangle();
    line2.name = "content-line-2";
    line2.resize(260, 12);
    line2.x = 20;
    line2.y = 86;
    line2.cornerRadius = 6;
    line2.fills = [solidPaint("#F7F7F8")];
    card.appendChild(line2);
    const line3 = figma.createRectangle();
    line3.name = "content-line-3";
    line3.resize(180, 12);
    line3.x = 20;
    line3.y = 112;
    line3.cornerRadius = 6;
    line3.fills = [solidPaint("#F7F7F8")];
    card.appendChild(line3);

    return y + 240;
  }

  function buildTableSection(page, startY) {
    addCanvasText(page, "Table Sample", 0, startY, { fontSize: 20, fontStyle: "Bold" });
    const y = startY + 42;

    const header = createShapeFrame("Table/HeaderRow", 600, COMPONENT_TOKEN_TREE.table.headerHeight, 0, y, {
      fill: "#F7F7F8"
    });
    page.appendChild(header);
    addCanvasText(header, "Order ID", 16, 13, { fontSize: 13, fontStyle: "Medium" });
    addCanvasText(header, "Status", 220, 13, { fontSize: 13, fontStyle: "Medium" });
    addCanvasText(header, "ETA", 420, 13, { fontSize: 13, fontStyle: "Medium" });
    addBottomBorder(header, "#E5E7EB");

    const row = createShapeFrame(
      "Table/DataRow",
      600,
      COMPONENT_TOKEN_TREE.table.rowHeight,
      0,
      y + COMPONENT_TOKEN_TREE.table.headerHeight,
      {
      fill: "#FFFFFF"
      }
    );
    page.appendChild(row);
    addCanvasText(row, "TI-2026-001", 16, 17, { fontSize: 14 });
    addCanvasText(row, "Submitted", 220, 17, { fontSize: 14 });
    addCanvasText(row, "Mar 31", 420, 17, { fontSize: 14 });
    addBottomBorder(row, "#E5E7EB");

    return y + COMPONENT_TOKEN_TREE.table.headerHeight + COMPONENT_TOKEN_TREE.table.rowHeight + 40;
  }

  function buildAvatarSection(page, startY) {
    addCanvasText(page, "Avatar", 0, startY, { fontSize: 20, fontStyle: "Bold" });
    const y = startY + 42;

    AVATAR_SIZES.forEach((avatar, index) => {
      const x = index * 100;
      const ellipse = figma.createEllipse();
      ellipse.name = `Avatar/${avatar.key}`;
      ellipse.resize(avatar.size, avatar.size);
      ellipse.x = x;
      ellipse.y = y;
      ellipse.fills = [solidPaint("#605BFF")];
      page.appendChild(ellipse);

      const label = makeText("TI", {
        fontSize: avatar.fontSize,
        fontStyle: "Bold",
        fill: "#FFFFFF"
      });
      label.x = x + Math.round((avatar.size - label.width) / 2);
      label.y = y + Math.round((avatar.size - label.height) / 2);
      page.appendChild(label);
    });
  }

  function buildComponentsPage(page) {
    clearPage(page);
    addCanvasText(page, "Styles and states live in component variants. Numeric metrics live in Variables.", 0, 0, {
      fontSize: 12,
      fill: "#7E7E8F"
    });

    let nextY = 36;
    nextY = buildButtonsSection(page, nextY);
    nextY = buildTogglesSection(page, nextY);
    nextY = buildBadgesSection(page, nextY);
    nextY = buildInputCardSection(page, nextY);
    nextY = buildTableSection(page, nextY);
    buildAvatarSection(page, nextY);
  }

  function buildSpacingPage(page, spacingCollection, spacingVariables) {
    clearPage(page);
    page.setExplicitVariableModeForCollection(spacingCollection, spacingCollection.modes[0].modeId);
    addCanvasText(page, "Radius", 0, 0, { fontSize: 20, fontStyle: "Bold" });

    FLOAT_TOKENS.filter(([name]) => name.startsWith("radius/")).forEach(([name, value], index) => {
      const x = index * 100;
      const frame = createShapeFrame(name, 80, 80, x, 48, {
        cornerRadius: value,
        fill: "#605BFF"
      });
      bindUniformRadius(frame, spacingVariables.get(name));
      page.appendChild(frame);
      addCanvasText(page, name, x, 136, {
        fontSize: 12,
        fill: "#7E7E8F"
      });
    });

    addCanvasText(page, "Spacing", 0, 188, { fontSize: 20, fontStyle: "Bold" });
    FLOAT_TOKENS.filter(([name]) => name.startsWith("spacing/")).forEach(([name, value], index) => {
      const y = 236 + index * 42;
      addCanvasText(page, name, 0, y + 2, {
        fontSize: 12,
        fontStyle: "Medium",
        fill: "#7E7E8F"
      });

      const bar = createShapeFrame(`${name}-bar`, Math.max(value, 4), 16, 140, y, {
        cornerRadius: 8,
        fill: "#E4E0FB"
      });
      if (spacingVariables.get(name)) {
        bar.setBoundVariable("width", spacingVariables.get(name));
      }
      page.appendChild(bar);
      addCanvasText(page, `${value}px`, 220, y + 1, {
        fontSize: 12,
        fill: "#030229"
      });
    });
  }

  function buildTypographyPage(page, spacingCollection, typographyCollection, spacingVariables, typographyVariables) {
    clearPage(page);
    page.setExplicitVariableModeForCollection(spacingCollection, spacingCollection.modes[0].modeId);
    page.setExplicitVariableModeForCollection(typographyCollection, typographyCollection.modes[0].modeId);

    addCanvasText(page, "Font Family", 0, 0, { fontSize: 20, fontStyle: "Bold" });

    const primarySample = addCanvasText(page, "Primary font sample / Dashboard Heading", 0, 48, {
      fontSize: 28,
      fontStyle: "Bold"
    });
    bindTextVariable(primarySample, "fontFamily", typographyVariables.get("font/primary"));
    bindTextVariable(primarySample, "fontWeight", typographyVariables.get("fontWeight/bold"));
    bindTextVariable(primarySample, "fontSize", spacingVariables.get("fontSize/3xl"));

    addCanvasText(page, "font/primary + fontWeight/bold + fontSize/3xl", 0, 92, {
      fontSize: 12,
      fill: "#7E7E8F"
    });

    const secondarySample = addCanvasText(page, "Secondary font sample / Supporting copy", 0, 136, {
      fontSize: 16,
      fill: "#7E7E8F"
    });
    bindTextVariable(secondarySample, "fontFamily", typographyVariables.get("font/secondary"));
    bindTextVariable(secondarySample, "fontWeight", typographyVariables.get("fontWeight/normal"));
    bindTextVariable(secondarySample, "fontSize", spacingVariables.get("fontSize/lg"));

    addCanvasText(page, "font/secondary + fontWeight/normal + fontSize/lg", 0, 168, {
      fontSize: 12,
      fill: "#7E7E8F"
    });

    addCanvasText(page, "Weight", 0, 228, { fontSize: 20, fontStyle: "Bold" });
    const weightTokens = [
      ["fontWeight/normal", "Normal 400"],
      ["fontWeight/medium", "Medium 500"],
      ["fontWeight/semibold", "Semibold 600"],
      ["fontWeight/bold", "Bold 700"]
    ];

    weightTokens.forEach(([name, label], index) => {
      const y = 276 + index * 42;
      const sample = addCanvasText(page, label, 0, y, {
        fontSize: 18,
        fontStyle: "Regular"
      });
      bindTextVariable(sample, "fontFamily", typographyVariables.get("font/primary"));
      bindTextVariable(sample, "fontWeight", typographyVariables.get(name));
      addCanvasText(page, name, 220, y + 4, {
        fontSize: 12,
        fill: "#7E7E8F"
      });
    });

    addCanvasText(page, "Type Scale", 0, 468, { fontSize: 20, fontStyle: "Bold" });
    FLOAT_TOKENS.filter(([name]) => name.startsWith("fontSize/")).forEach(([name], index) => {
      const y = 516 + index * 48;
      const sample = addCanvasText(page, name.replace("fontSize/", ""), 0, y, {
        fontSize: 14,
        fontStyle: "Medium"
      });
      bindTextVariable(sample, "fontFamily", typographyVariables.get("font/primary"));
      bindTextVariable(sample, "fontWeight", typographyVariables.get("fontWeight/medium"));
      bindTextVariable(sample, "fontSize", spacingVariables.get(name));
      addCanvasText(page, name, 200, y + 6, {
        fontSize: 12,
        fill: "#7E7E8F"
      });
    });
  }

  try {
    if (!figma.variables || !figma.variables.createVariableCollection) {
      throw new Error("This console script requires Figma variables support.");
    }

    const colorCount = countItems(COLOR_GROUPS);
    if (colorCount !== 46) {
      throw new Error(`Expected 46 color tokens, received ${colorCount}.`);
    }
    if (FLOAT_TOKENS.length !== 24) {
      throw new Error(`Expected 24 float tokens, received ${FLOAT_TOKENS.length}.`);
    }
    if (TYPOGRAPHY_STRING_TOKENS.length !== 2 || TYPOGRAPHY_FLOAT_TOKENS.length !== 4) {
      throw new Error("Unexpected typography token count.");
    }
    if (COMPONENT_FLOAT_TOKENS.length !== 143) {
      throw new Error(`Expected 143 component tokens, received ${COMPONENT_FLOAT_TOKENS.length}.`);
    }

    await loadFonts();

    const reusablePageRef = { current: removeEmptyPages() };
    const colorCollection = await getOrCreateCollection("color-primitive");
    const spacingCollection = await getOrCreateCollection("spacing");
    const typographyCollection = await getOrCreateCollection("typography");
    const componentCollection = await getOrCreateCollection("component");
    const colorVariables = await syncVariables(
      colorCollection,
      "COLOR",
      COLOR_GROUPS.flatMap((group) => group.items)
    );
    const spacingVariables = await syncVariables(spacingCollection, "FLOAT", FLOAT_TOKENS);
    const typographyVariables = new Map();
    const typographyStringVariables = await syncVariables(typographyCollection, "STRING", TYPOGRAPHY_STRING_TOKENS);
    const typographyFloatVariables = await syncVariables(typographyCollection, "FLOAT", TYPOGRAPHY_FLOAT_TOKENS);
    for (const [name, variable] of typographyStringVariables) {
      typographyVariables.set(name, variable);
    }
    for (const [name, variable] of typographyFloatVariables) {
      typographyVariables.set(name, variable);
    }
    await syncVariables(componentCollection, "FLOAT", COMPONENT_FLOAT_TOKENS);

    const colorsPage = getOrCreatePage("🎨 Colors", reusablePageRef);
    const componentsPage = getOrCreatePage("🧱 Components", reusablePageRef);
    const spacingPage = getOrCreatePage("📏 Spacing", reusablePageRef);
    const typographyPage = getOrCreatePage("🔤 Typography", reusablePageRef);

    buildColorsPage(colorsPage, colorCollection, colorVariables);
    buildComponentsPage(componentsPage);
    buildSpacingPage(spacingPage, spacingCollection, spacingVariables);
    buildTypographyPage(
      typographyPage,
      spacingCollection,
      typographyCollection,
      spacingVariables,
      typographyVariables
    );

    if (reusablePageRef.current && reusablePageRef.current.children.length === 0) {
      reusablePageRef.current.remove();
    }

    figma.currentPage = colorsPage;
    if (colorsPage.children.length > 0) {
      figma.viewport.scrollAndZoomIntoView(colorsPage.children.slice(0, 10));
    }

    figma.notify("Trade Intel setup complete: foundations + typography + component variables synced.");
    console.log("Trade Intel setup complete.");
  } catch (error) {
    console.error(error);
    throw error;
  }
})();
