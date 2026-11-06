function Code(el)
  if FORMAT:match("latex") then
    return pandoc.RawInline("latex", "\\nolinkurl{" .. el.text .. "}")
  end
end

function Image(el)
  local stem = el.src:match("([^/]+)%.pdf$")
  if FORMAT:match("html") then
    el.src = "../figures/" .. assert(images[stem])
    el.attributes.width = nil
  else
    el.src = "__REPORT_ROOT__/" .. el.src
  end
  return el
end

function Str(el)
  if FORMAT:match("latex") and el.text:match("^[%w%-]+/[%w%/-]+$") then
    return pandoc.RawInline("latex", el.text:gsub("/", "\\slash "))
  end
end

function Table(el)
  if FORMAT:match("latex") then
    local wide = #el.colspecs >= 9
    local compact = #el.colspecs >= 6
    if compact then
      local count = #el.colspecs
      local width = math.floor(8000 / (count - 1)) / 10000
      for i = 1, count do
        if i == 1 then
          el.colspecs[i][2] = 0.20
        elseif i == count then
          el.colspecs[i][2] = 0.80 - width * (count - 2)
        else
          el.colspecs[i][2] = width
        end
      end
    end
    local begin = wide and "\\begin{landscape}\\small"
      or "\\begingroup\\footnotesize\\setlength{\\tabcolsep}{2pt}"
    local ending = wide and "\\end{landscape}" or "\\endgroup"
    return {pandoc.RawBlock("latex", begin), el, pandoc.RawBlock("latex", ending)}
  end
end
