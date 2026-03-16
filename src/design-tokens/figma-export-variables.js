// ============================================================
// Figma Plugin Console helper
// Trade Intel foundation tokens export
//
// Usage:
//   1. Open the Trade Intel file in Figma
//   2. Plugins -> Development -> Open console
//   3. Paste this file into the console and run it
//   4. Copy the JSON payload from the modal
//   5. Save it locally, then run:
//      npm run figma:sync -- ./tmp/figma-foundations.json
// ============================================================

(async () => {
  const COLOR_VARIABLES = [
    "primary/DEFAULT",
    "primary/foreground",
    "secondary/DEFAULT",
    "secondary/foreground",
    "destructive/DEFAULT",
    "destructive/foreground",
    "accent/DEFAULT",
    "accent/foreground",
    "muted/DEFAULT",
    "muted/foreground",
    "background",
    "foreground",
    "card/DEFAULT",
    "card/foreground",
    "border",
    "input",
    "ring",
    "semantic/success",
    "semantic/success-fg",
    "semantic/success-bg",
    "semantic/warning",
    "semantic/warning-fg",
    "semantic/warning-bg",
    "semantic/error",
    "semantic/error-fg",
    "semantic/error-bg",
    "semantic/info",
    "semantic/info-fg",
    "semantic/info-bg",
    "sidebar/bg",
    "sidebar/foreground",
    "sidebar/accent",
    "sidebar/muted",
    "sidebar/inactive",
    "status/draft",
    "status/submitted",
    "status/vendor-review",
    "status/sales-review",
    "status/needs-decision",
    "status/confirmed",
    "status/rejected",
    "status/invoiced",
    "status/partially-shipped",
    "status/shipped",
    "status/completed",
    "status/cancelled",
  ];

  const FLOAT_VARIABLES = [
    "radius/none",
    "radius/s",
    "radius/m",
    "radius/l",
    "radius/pill",
    "spacing/0",
    "spacing/1",
    "spacing/2",
    "spacing/3",
    "spacing/4",
    "spacing/5",
    "spacing/6",
    "spacing/8",
    "spacing/10",
    "spacing/12",
    "spacing/16",
    "fontSize/xs",
    "fontSize/sm",
    "fontSize/base",
    "fontSize/lg",
    "fontSize/xl",
    "fontSize/2xl",
    "fontSize/3xl",
    "fontSize/4xl",
  ];

  const TYPOGRAPHY_STRING_VARIABLES = [
    "font/primary",
    "font/secondary",
  ];

  const TYPOGRAPHY_NUMBER_VARIABLES = [
    "fontWeight/normal",
    "fontWeight/medium",
    "fontWeight/semibold",
    "fontWeight/bold",
  ];

  const COMPONENT_NUMBER_VARIABLES = [
    "button/sm/height",
    "button/sm/paddingY",
    "button/sm/paddingX",
    "button/sm/gap",
    "button/sm/iconSize",
    "button/sm/fontSize",
    "button/md/height",
    "button/md/paddingY",
    "button/md/paddingX",
    "button/md/gap",
    "button/md/iconSize",
    "button/md/fontSize",
    "button/lg/height",
    "button/lg/paddingY",
    "button/lg/paddingX",
    "button/lg/gap",
    "button/lg/iconSize",
    "button/lg/fontSize",
    "button/icon/height",
    "button/icon/width",
    "button/icon/paddingY",
    "button/icon/paddingX",
    "button/icon/iconSize",
    "toggle/sm/width",
    "toggle/sm/height",
    "toggle/sm/thumbSize",
    "toggle/md/width",
    "toggle/md/height",
    "toggle/md/thumbSize",
    "toggle/lg/width",
    "toggle/lg/height",
    "toggle/lg/thumbSize",
    "input/sm/height",
    "input/sm/paddingY",
    "input/sm/paddingX",
    "input/sm/fontSize",
    "input/sm/labelGap",
    "input/md/height",
    "input/md/paddingY",
    "input/md/paddingX",
    "input/md/fontSize",
    "input/md/labelGap",
    "input/lg/height",
    "input/lg/paddingY",
    "input/lg/paddingX",
    "input/lg/fontSize",
    "input/lg/labelGap",
    "input/gap",
    "badge/sm/paddingY",
    "badge/sm/paddingX",
    "badge/sm/fontSize",
    "badge/md/paddingY",
    "badge/md/paddingX",
    "badge/md/fontSize",
    "badge/lg/paddingY",
    "badge/lg/paddingX",
    "badge/lg/fontSize",
    "badge/gap",
    "card/headerPaddingY",
    "card/headerPaddingX",
    "card/contentPaddingTop",
    "card/contentPaddingRight",
    "card/contentPaddingBottom",
    "card/contentPaddingLeft",
    "card/gap",
    "table/headerHeight",
    "table/rowHeight",
    "table/cellPaddingY",
    "table/cellPaddingX",
    "sidebar/width",
    "sidebar/itemPaddingY",
    "sidebar/itemPaddingX",
    "sidebar/itemGap",
    "sidebar/containerPaddingY",
    "sidebar/containerPaddingX",
    "headerBar/height",
    "headerBar/paddingY",
    "headerBar/paddingX",
    "headerBar/avatarSize",
    "select/height",
    "select/paddingY",
    "select/paddingX",
    "select/optionHeight",
    "select/fontSize",
    "select/labelGap",
    "tabs/paddingY",
    "tabs/paddingX",
    "tabs/fontSize",
    "tabs/borderWidth",
    "tabs/gap",
    "modal/sm/width",
    "modal/md/width",
    "modal/lg/width",
    "modal/headerPaddingTop",
    "modal/headerPaddingRight",
    "modal/headerPaddingBottom",
    "modal/headerPaddingLeft",
    "modal/bodyPaddingY",
    "modal/bodyPaddingX",
    "modal/footerPaddingTop",
    "modal/footerPaddingRight",
    "modal/footerPaddingBottom",
    "modal/footerPaddingLeft",
    "modal/gap",
    "modal/titleSize",
    "modal/closeSize",
    "avatar/sm/size",
    "avatar/sm/fontSize",
    "avatar/md/size",
    "avatar/md/fontSize",
    "avatar/lg/size",
    "avatar/lg/fontSize",
    "toast/width",
    "toast/paddingY",
    "toast/paddingX",
    "toast/gap",
    "toast/titleSize",
    "toast/descSize",
    "toast/iconSize",
    "toast/closeSize",
    "tooltip/paddingY",
    "tooltip/paddingX",
    "tooltip/fontSize",
    "pagination/itemSize",
    "pagination/gap",
    "pagination/fontSize",
    "pagination/iconSize",
    "checkbox/size",
    "checkbox/checkSize",
    "checkbox/borderWidth",
    "spinner/sm/size",
    "spinner/sm/strokeWidth",
    "spinner/md/size",
    "spinner/md/strokeWidth",
    "spinner/lg/size",
    "spinner/lg/strokeWidth",
    "emptyState/iconSize",
    "emptyState/titleSize",
    "emptyState/descSize",
    "emptyState/paddingY",
    "emptyState/paddingX",
    "emptyState/gap",
    "divider/thickness",
  ];

  function rgbaToHex(color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
  }

  function buildUiHtml() {
    return `
      <style>
        body {
          margin: 0;
          font-family: Inter, system-ui, sans-serif;
          background: #111827;
          color: #f9fafb;
        }
        .wrap {
          display: flex;
          flex-direction: column;
          height: 100vh;
          padding: 16px;
          box-sizing: border-box;
          gap: 12px;
        }
        .meta {
          font-size: 12px;
          color: #cbd5e1;
        }
        textarea {
          flex: 1;
          width: 100%;
          resize: none;
          border: 1px solid #374151;
          border-radius: 10px;
          background: #030712;
          color: #e5e7eb;
          font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
          padding: 12px;
          box-sizing: border-box;
        }
        .actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        button {
          border: 0;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .primary {
          background: #605BFF;
          color: white;
        }
        .secondary {
          background: #1f2937;
          color: #e5e7eb;
        }
      </style>
      <div class="wrap">
        <div>
          <div style="font-size:14px;font-weight:700;">Trade Intel foundation export</div>
          <div id="meta" class="meta">Preparing export...</div>
        </div>
        <textarea id="payload" spellcheck="false"></textarea>
        <div class="actions">
          <button id="close" class="secondary">Close</button>
          <button id="copy" class="primary">Copy JSON</button>
        </div>
      </div>
      <script>
        const meta = document.getElementById("meta");
        const payload = document.getElementById("payload");
        const copyButton = document.getElementById("copy");
        const closeButton = document.getElementById("close");

        window.onmessage = async (event) => {
          const message = event.data.pluginMessage;
          if (!message || message.type !== "payload") return;

          payload.value = message.json;
          meta.textContent = message.summary;
        };

        copyButton.onclick = async () => {
          await navigator.clipboard.writeText(payload.value);
          parent.postMessage({ pluginMessage: { type: "copied" } }, "*");
        };

        closeButton.onclick = () => {
          parent.postMessage({ pluginMessage: { type: "close" } }, "*");
        };
      </script>
    `;
  }

  async function getCollection(name, options = {}) {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const collection = collections.find((item) => !item.remote && item.name === name);

    if (!collection) {
      if (options.optional) {
        return null;
      }
      throw new Error(`Variable collection not found: ${name}`);
    }

    return collection;
  }

  function assignColorToken(target, name, hex) {
    if (name.startsWith("semantic/")) {
      const tokenName = name.slice("semantic/".length);
      if (tokenName.endsWith("-fg")) {
        const key = tokenName.replace(/-fg$/, "");
        target.semantic[key] = target.semantic[key] || {};
        target.semantic[key].foreground = hex;
        return;
      }
      if (tokenName.endsWith("-bg")) {
        const key = tokenName.replace(/-bg$/, "");
        target.semantic[key] = target.semantic[key] || {};
        target.semantic[key].bg = hex;
        return;
      }

      target.semantic[tokenName] = target.semantic[tokenName] || {};
      target.semantic[tokenName].DEFAULT = hex;
      return;
    }

    if (name.startsWith("sidebar/")) {
      target.sidebar[name.slice("sidebar/".length)] = hex;
      return;
    }

    if (name.startsWith("status/")) {
      target.status[name.slice("status/".length)] = hex;
      return;
    }

    if (name.includes("/")) {
      const [group, key] = name.split("/");
      target[group] = target[group] || {};
      target[group][key === "DEFAULT" ? "DEFAULT" : key] = hex;
      return;
    }

    target[name] = hex;
  }

  function assignFloatToken(target, name, value) {
    const [group, key] = name.split("/");

    if (group === "radius") {
      target.radius[key] = value;
      return;
    }
    if (group === "spacing") {
      target.spacing[key] = value;
      return;
    }
    if (group === "fontSize") {
      target.fontSize[key] = value;
    }
  }

  function buildComponentTokens(values) {
    const get = (name) => {
      if (!(name in values)) {
        throw new Error(`Missing component variable: ${name}`);
      }
      return values[name];
    };

    return {
      button: {
        sm: {
          height: get("button/sm/height"),
          padding: [get("button/sm/paddingY"), get("button/sm/paddingX")],
          gap: get("button/sm/gap"),
          iconSize: get("button/sm/iconSize"),
          fontSize: get("button/sm/fontSize"),
        },
        md: {
          height: get("button/md/height"),
          padding: [get("button/md/paddingY"), get("button/md/paddingX")],
          gap: get("button/md/gap"),
          iconSize: get("button/md/iconSize"),
          fontSize: get("button/md/fontSize"),
        },
        lg: {
          height: get("button/lg/height"),
          padding: [get("button/lg/paddingY"), get("button/lg/paddingX")],
          gap: get("button/lg/gap"),
          iconSize: get("button/lg/iconSize"),
          fontSize: get("button/lg/fontSize"),
        },
        icon: {
          height: get("button/icon/height"),
          width: get("button/icon/width"),
          padding: [get("button/icon/paddingY"), get("button/icon/paddingX")],
          iconSize: get("button/icon/iconSize"),
        },
      },
      toggle: {
        sm: {
          width: get("toggle/sm/width"),
          height: get("toggle/sm/height"),
          thumbSize: get("toggle/sm/thumbSize"),
        },
        md: {
          width: get("toggle/md/width"),
          height: get("toggle/md/height"),
          thumbSize: get("toggle/md/thumbSize"),
        },
        lg: {
          width: get("toggle/lg/width"),
          height: get("toggle/lg/height"),
          thumbSize: get("toggle/lg/thumbSize"),
        },
      },
      input: {
        sm: {
          height: get("input/sm/height"),
          padding: [get("input/sm/paddingY"), get("input/sm/paddingX")],
          fontSize: get("input/sm/fontSize"),
          labelGap: get("input/sm/labelGap"),
        },
        md: {
          height: get("input/md/height"),
          padding: [get("input/md/paddingY"), get("input/md/paddingX")],
          fontSize: get("input/md/fontSize"),
          labelGap: get("input/md/labelGap"),
        },
        lg: {
          height: get("input/lg/height"),
          padding: [get("input/lg/paddingY"), get("input/lg/paddingX")],
          fontSize: get("input/lg/fontSize"),
          labelGap: get("input/lg/labelGap"),
        },
        gap: get("input/gap"),
      },
      badge: {
        sm: {
          padding: [get("badge/sm/paddingY"), get("badge/sm/paddingX")],
          fontSize: get("badge/sm/fontSize"),
        },
        md: {
          padding: [get("badge/md/paddingY"), get("badge/md/paddingX")],
          fontSize: get("badge/md/fontSize"),
        },
        lg: {
          padding: [get("badge/lg/paddingY"), get("badge/lg/paddingX")],
          fontSize: get("badge/lg/fontSize"),
        },
        gap: get("badge/gap"),
      },
      card: {
        headerPadding: [get("card/headerPaddingY"), get("card/headerPaddingX")],
        contentPadding: [
          get("card/contentPaddingTop"),
          get("card/contentPaddingRight"),
          get("card/contentPaddingBottom"),
          get("card/contentPaddingLeft"),
        ],
        gap: get("card/gap"),
      },
      table: {
        headerHeight: get("table/headerHeight"),
        rowHeight: get("table/rowHeight"),
        cellPadding: [get("table/cellPaddingY"), get("table/cellPaddingX")],
      },
      sidebar: {
        width: get("sidebar/width"),
        itemPadding: [get("sidebar/itemPaddingY"), get("sidebar/itemPaddingX")],
        itemGap: get("sidebar/itemGap"),
        containerPadding: [get("sidebar/containerPaddingY"), get("sidebar/containerPaddingX")],
      },
      headerBar: {
        height: get("headerBar/height"),
        padding: [get("headerBar/paddingY"), get("headerBar/paddingX")],
        avatarSize: get("headerBar/avatarSize"),
      },
      select: {
        height: get("select/height"),
        padding: [get("select/paddingY"), get("select/paddingX")],
        optionHeight: get("select/optionHeight"),
        fontSize: get("select/fontSize"),
        labelGap: get("select/labelGap"),
      },
      tabs: {
        padding: [get("tabs/paddingY"), get("tabs/paddingX")],
        fontSize: get("tabs/fontSize"),
        borderWidth: get("tabs/borderWidth"),
        gap: get("tabs/gap"),
      },
      modal: {
        sm: { width: get("modal/sm/width") },
        md: { width: get("modal/md/width") },
        lg: { width: get("modal/lg/width") },
        headerPadding: [
          get("modal/headerPaddingTop"),
          get("modal/headerPaddingRight"),
          get("modal/headerPaddingBottom"),
          get("modal/headerPaddingLeft"),
        ],
        bodyPadding: [get("modal/bodyPaddingY"), get("modal/bodyPaddingX")],
        footerPadding: [
          get("modal/footerPaddingTop"),
          get("modal/footerPaddingRight"),
          get("modal/footerPaddingBottom"),
          get("modal/footerPaddingLeft"),
        ],
        gap: get("modal/gap"),
        titleSize: get("modal/titleSize"),
        closeSize: get("modal/closeSize"),
      },
      avatar: {
        sm: { size: get("avatar/sm/size"), fontSize: get("avatar/sm/fontSize") },
        md: { size: get("avatar/md/size"), fontSize: get("avatar/md/fontSize") },
        lg: { size: get("avatar/lg/size"), fontSize: get("avatar/lg/fontSize") },
      },
      toast: {
        width: get("toast/width"),
        padding: [get("toast/paddingY"), get("toast/paddingX")],
        gap: get("toast/gap"),
        titleSize: get("toast/titleSize"),
        descSize: get("toast/descSize"),
        iconSize: get("toast/iconSize"),
        closeSize: get("toast/closeSize"),
      },
      tooltip: {
        padding: [get("tooltip/paddingY"), get("tooltip/paddingX")],
        fontSize: get("tooltip/fontSize"),
      },
      pagination: {
        itemSize: get("pagination/itemSize"),
        gap: get("pagination/gap"),
        fontSize: get("pagination/fontSize"),
        iconSize: get("pagination/iconSize"),
      },
      checkbox: {
        size: get("checkbox/size"),
        checkSize: get("checkbox/checkSize"),
        borderWidth: get("checkbox/borderWidth"),
      },
      spinner: {
        sm: { size: get("spinner/sm/size"), strokeWidth: get("spinner/sm/strokeWidth") },
        md: { size: get("spinner/md/size"), strokeWidth: get("spinner/md/strokeWidth") },
        lg: { size: get("spinner/lg/size"), strokeWidth: get("spinner/lg/strokeWidth") },
      },
      emptyState: {
        iconSize: get("emptyState/iconSize"),
        titleSize: get("emptyState/titleSize"),
        descSize: get("emptyState/descSize"),
        padding: [get("emptyState/paddingY"), get("emptyState/paddingX")],
        gap: get("emptyState/gap"),
      },
      divider: {
        thickness: get("divider/thickness"),
      },
    };
  }

  function resolveValue(variable, modeId, variablesById, stack) {
    const rawValue = variable.valuesByMode[modeId];

    if (rawValue && rawValue.type === "VARIABLE_ALIAS") {
      if (stack.has(rawValue.id)) {
        throw new Error(`Variable alias cycle detected: ${variable.name}`);
      }

      const next = variablesById.get(rawValue.id);
      if (!next) {
        throw new Error(`Aliased variable not found: ${rawValue.id}`);
      }

      stack.add(rawValue.id);
      return resolveValue(next, modeId, variablesById, stack);
    }

    return rawValue;
  }

  async function exportFoundationTokens() {
    const colorCollection = await getCollection("color-primitive");
    const spacingCollection = await getCollection("spacing");
    const typographyCollection = await getCollection("typography", { optional: true });
    const componentCollection = await getCollection("component", { optional: true });

    const colorModeId = colorCollection.modes[0].modeId;
    const floatModeId = spacingCollection.modes[0].modeId;

    const colorVariables = (await figma.variables.getLocalVariablesAsync("COLOR")).filter(
      (variable) => variable.variableCollectionId === colorCollection.id,
    );
    const floatVariables = (await figma.variables.getLocalVariablesAsync("FLOAT")).filter(
      (variable) => variable.variableCollectionId === spacingCollection.id,
    );
    const typographyStringVariables = typographyCollection
      ? (await figma.variables.getLocalVariablesAsync("STRING")).filter(
          (variable) => variable.variableCollectionId === typographyCollection.id,
        )
      : [];
    const typographyNumberVariables = typographyCollection
      ? (await figma.variables.getLocalVariablesAsync("FLOAT")).filter(
          (variable) => variable.variableCollectionId === typographyCollection.id,
        )
      : [];
    const componentVariables = componentCollection
      ? (await figma.variables.getLocalVariablesAsync("FLOAT")).filter(
          (variable) => variable.variableCollectionId === componentCollection.id,
        )
      : [];

    const variablesById = new Map(
      [
        ...colorVariables,
        ...floatVariables,
        ...typographyStringVariables,
        ...typographyNumberVariables,
        ...componentVariables,
      ].map((variable) => [variable.id, variable]),
    );
    const colorByName = new Map(colorVariables.map((variable) => [variable.name, variable]));
    const floatByName = new Map(floatVariables.map((variable) => [variable.name, variable]));
    const typographyStringByName = new Map(
      typographyStringVariables.map((variable) => [variable.name, variable]),
    );
    const typographyNumberByName = new Map(
      typographyNumberVariables.map((variable) => [variable.name, variable]),
    );
    const componentByName = new Map(componentVariables.map((variable) => [variable.name, variable]));

    const foundation = {
      _meta: {
        source: `Figma Variables (${figma.root.name})`,
        exportedAt: new Date().toISOString(),
        description: "Trade Intel foundation tokens exported from Figma Variables",
      },
      color: {
        semantic: {},
        sidebar: {},
        status: {},
      },
      radius: {},
      spacing: {},
      fontSize: {},
    };

    for (const name of COLOR_VARIABLES) {
      const variable = colorByName.get(name);
      if (!variable) {
        throw new Error(`Missing color variable: ${name}`);
      }

      const value = resolveValue(variable, colorModeId, variablesById, new Set([variable.id]));
      if (!value || typeof value !== "object" || typeof value.r !== "number") {
        throw new Error(`Invalid color value: ${name}`);
      }

      assignColorToken(foundation.color, name, rgbaToHex(value));
    }

    for (const name of FLOAT_VARIABLES) {
      const variable = floatByName.get(name);
      if (!variable) {
        throw new Error(`Missing float variable: ${name}`);
      }

      const value = resolveValue(variable, floatModeId, variablesById, new Set([variable.id]));
      if (typeof value !== "number") {
        throw new Error(`Invalid float value: ${name}`);
      }

      assignFloatToken(foundation, name, value);
    }

    if (typographyCollection) {
      const typographyModeId = typographyCollection.modes[0].modeId;
      foundation.font = {};
      foundation.fontWeight = {};

      for (const name of TYPOGRAPHY_STRING_VARIABLES) {
        const variable = typographyStringByName.get(name);
        if (!variable) {
          throw new Error(`Missing typography variable: ${name}`);
        }

        const value = resolveValue(variable, typographyModeId, variablesById, new Set([variable.id]));
        if (typeof value !== "string") {
          throw new Error(`Invalid typography string value: ${name}`);
        }

        const [, key] = name.split("/");
        foundation.font[key] = value;
      }

      for (const name of TYPOGRAPHY_NUMBER_VARIABLES) {
        const variable = typographyNumberByName.get(name);
        if (!variable) {
          throw new Error(`Missing typography variable: ${name}`);
        }

        const value = resolveValue(variable, typographyModeId, variablesById, new Set([variable.id]));
        if (typeof value !== "number") {
          throw new Error(`Invalid typography number value: ${name}`);
        }

        const [, key] = name.split("/");
        foundation.fontWeight[key] = String(value);
      }
    }

    if (componentCollection) {
      const componentModeId = componentCollection.modes[0].modeId;
      const componentValues = {};

      for (const name of COMPONENT_NUMBER_VARIABLES) {
        const variable = componentByName.get(name);
        if (!variable) {
          throw new Error(`Missing component variable: ${name}`);
        }

        const value = resolveValue(variable, componentModeId, variablesById, new Set([variable.id]));
        if (typeof value !== "number") {
          throw new Error(`Invalid component value: ${name}`);
        }

        componentValues[name] = value;
      }

      foundation.component = buildComponentTokens(componentValues);
    }

    return foundation;
  }

  try {
    const foundation = await exportFoundationTokens();
    const payload = JSON.stringify(foundation, null, 2);

    figma.showUI(buildUiHtml(), {
      width: 720,
      height: 640,
      title: "Trade Intel token export",
    });

    figma.ui.onmessage = (message) => {
      if (message.type === "copied") {
        figma.notify("Foundation token JSON copied.");
      }
      if (message.type === "close") {
        figma.closePlugin();
      }
    };

    figma.ui.postMessage({
      type: "payload",
      json: payload,
      summary:
        "color-primitive / spacing export 완료. typography, component 컬렉션이 있으면 함께 포함됩니다. JSON 저장 후 npm run figma:sync 실행.",
    });

    console.log(payload);
  } catch (error) {
    console.error(error);
    figma.closePlugin(error && error.message ? error.message : "Export failed.");
  }
})();
