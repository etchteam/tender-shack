export default function(...fields) {
    return fields.filter(field => {
        return field.match(/(web|app|crm|cms|internet|hosting)/i);
    }).length > 0;
}