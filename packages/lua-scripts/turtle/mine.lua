rednet.open("right")
print("mine.lua running")
print("#ID: " .. os.getComputerID())

local path = {}

-- FUNCTIONS

function fwd()
    while not turtle.forward() do
        turtle.dig()
    end
end

function back()
    turtle.turnRight()
    turtle.turnRight()
    fwd()
    turtle.turnRight()
    turtle.turnRight()
end

function right()
    turtle.turnRight()
    fwd()
    turtle.turnLeft()
end

function left()
    turtle.turnLeft()
    fwd()
    turtle.turnRight()
end

function up()
    while not turtle.up() do
        turtle.digUp()
    end
end

function down()
    while not turtle.down() do
        turtle.digDown()
    end
end


function addPath(m)
    path[#path + 1] = m
end

function returnHome()
    for i = #path, 1, -1 do
        if path[i] == "f" then
            back()
        elseif path[i] == "b" then
            fwd()
        elseif path[i] == "r" then
            left()
        elseif path[i] == "l" then
            right()
        elseif path[i] == "u" then
            down()
        elseif path[i] == "d" then
            up()
        end

        table.remove(path, i)
    end

    path = {}
end

function main()
    while true do
        local _, msg = rednet.receive()

        if msg == "stop" then
            break
        elseif msg == "return" then
            returnHome()
        elseif msg == "f" then
            fwd()
            addPath("f")
        elseif msg == "b" then
            back()
            addPath("b")
        elseif msg == "r" then
            right()
            addPath("r")
        elseif msg == "l" then
            left()
            addPath("l")
        elseif msg == "u" then
            up()
            addPath("u")
        elseif msg == "d" then
            down()
            addPath("d")
        end

        -- print("(x: " .. currPos.x .. " y: " .. currPos.y .. " z: " .. currPos.z .. ")")
    end
end

main()
print("mine.lua exited")
rednet.close()
