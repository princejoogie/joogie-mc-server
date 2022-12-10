local args = {...}
local id

if not args[1] then
    print("No ID provided.")
    os.exit(1);
else
    id = tonumber(args[1])
end

rednet.open("back")
print("control.lua running")

while true do
    term.write(" -> ")
    local msg = read()

    if msg == "exit" then
        break
    else
        rednet.send(id, msg)
    end
end

print("control.lua exited")
rednet.close()
